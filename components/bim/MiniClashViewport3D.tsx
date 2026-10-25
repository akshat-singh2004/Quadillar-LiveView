"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Maximize2, AlertOctagon, RotateCw } from "lucide-react";
import Link from "next/link";

interface MiniClashViewportProps {
  clashId?: string;
  gridLocation?: string;
  structuralElement?: string;
  mepElement?: string;
  penetrationMm?: number;
  dedicatedUrl?: string;
  height?: number;
}

export function MiniClashViewport3D({
  clashId = "CLASH-F8-01",
  gridLocation = "Grid F-8 Level 3",
  structuralElement = "PT Post-Tensioned Beam Bay 2",
  mepElement = "150mm Chilled Water Pipe",
  penetrationMm = 125,
  dedicatedUrl = "/engineering/clashes",
  height = 200,
}: MiniClashViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 360;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712); // slate-950

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(4, 3, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const redPointLight = new THREE.PointLight(0xef4444, 4, 8);
    redPointLight.position.set(0, 0, 0);
    scene.add(redPointLight);

    // 1. Structural Element (PT Beam: Translucent Grey Slab/Beam)
    const beamGeo = new THREE.BoxGeometry(4.5, 1.8, 1.4);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.55,
      roughness: 0.4,
      metalness: 0.2,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    scene.add(beamMesh);

    // Wireframe edges on beam for architectural CAD clarity
    const edgesGeo = new THREE.EdgesGeometry(beamGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 1.5 });
    const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    scene.add(edgesMesh);

    // 2. MEP Element (Chilled Water Pipe: Cyan/Blue Metallic Cylinder)
    const pipeGeo = new THREE.CylinderGeometry(0.38, 0.38, 5, 32);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.8,
    });
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    pipeMesh.rotation.z = Math.PI / 2; // Pass perpendicularly through beam
    scene.add(pipeMesh);

    // 3. Volumetric Clash Core (Pulsing Glowing Neon-Red Sphere at Collision Point)
    const clashGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const clashMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xef4444,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const clashMesh = new THREE.Mesh(clashGeo, clashMat);
    scene.add(clashMesh);

    // 4. Clash Crosshair Target Ring
    const ringGeo = new THREE.RingGeometry(0.65, 0.72, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    scene.add(ringMesh);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(8, 8, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Pulse red clash marker
      const scale = 1 + Math.sin(elapsedTime * 4) * 0.12;
      clashMesh.scale.set(scale, scale, scale);
      clashMat.emissiveIntensity = 1 + Math.sin(elapsedTime * 4) * 0.5;

      // Slow orbital rotation
      if (isRotating) {
        scene.rotation.y += 0.008;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      pipeGeo.dispose();
      pipeMat.dispose();
      clashGeo.dispose();
      clashMat.dispose();
    };
  }, [height, isRotating]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-red-900/50 bg-slate-950 shadow-2xl">
      {/* HUD Header Overlay */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-[10px] font-mono text-red-300 backdrop-blur-md">
          <AlertOctagon className="w-3 h-3 text-red-400 animate-pulse" />
          <span>HARD INTERFERENCE: {penetrationMm}mm</span>
        </div>
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="pointer-events-auto p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition"
          title="Toggle Rotation"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>

      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} style={{ height: `${height}px` }} className="w-full cursor-grab active:cursor-grabbing" />

      {/* Bottom Metadata & Dedicated Page Deep-Link */}
      <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-200 text-[11px]">{gridLocation}</span>
          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[210px]">
            {mepElement} ⚡ {structuralElement}
          </span>
        </div>
        <Link
          href={dedicatedUrl}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white border border-red-500/40 font-medium text-[11px] transition shadow-lg shadow-red-950"
        >
          <Maximize2 className="w-3 h-3" />
          Inspect Fault
        </Link>
      </div>
    </div>
  );
}
