'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Layers, Scissors, Info, CheckCircle2 } from 'lucide-react';

interface BimViewerProps {
  modelUrl?: string;
  projectId?: string;
  [key: string]: any;
  modelName?: string;
  onElementSelected?: (elementData: SelectedElementData) => void;
}

export interface SelectedElementData {
  guid: string;
  name: string;
  elementName?: string;
  category: string;
  mixDesign?: string;
  structuralGrid: string;
  rebarSchedule: string;
}

export const BimModelViewer: React.FC<BimViewerProps> = ({
  modelName = 'GFC-Tower-A-Structural-LOD350.ifc',
  onElementSelected,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElementData | null>(null);
  const [clipHeight, setClipHeight] = useState<number>(100);
  const [activeDiscipline, setActiveDiscipline] = useState<'STRUCTURAL' | 'ALL'>('STRUCTURAL');

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080a0f');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(24, 20, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;

    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(30, 50, 20);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(40, 20, 0x10b981, 0x262626);
    grid.position.y = -0.01;
    scene.add(grid);

    const elementsGroup = new THREE.Group();
    const raycastableMeshes: THREE.Mesh[] = [];

    const columnGeo = new THREE.BoxGeometry(0.6, 4.0, 0.6);
    const beamGeoX = new THREE.BoxGeometry(6.0, 0.5, 0.4);
    const beamGeoZ = new THREE.BoxGeometry(0.4, 0.5, 6.0);
    const slabGeo = new THREE.BoxGeometry(18, 0.2, 18);

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.1,
    });

    const highlightMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      emissive: 0x064e3b,
    });

    for (let floor = 0; floor < 3; floor++) {
      const yOffset = floor * 4;

      const slab = new THREE.Mesh(slabGeo, concreteMat.clone());
      slab.position.set(6, yOffset + 4, 6);
      elementsGroup.add(slab);

      for (let x = 0; x <= 2; x++) {
        for (let z = 0; z <= 2; z++) {
          const colX = x * 6;
          const colZ = z * 6;

          const col = new THREE.Mesh(columnGeo, concreteMat.clone());
          col.position.set(colX, yOffset + 2, colZ);
          const colData: SelectedElementData = {
            guid: `IFC_COL_L${floor + 1}_${String.fromCharCode(65 + x)}${z + 1}`,
            name: `Column C${floor * 9 + x * 3 + z + 1}`,
            elementName: `Column C${floor * 9 + x * 3 + z + 1}`,
            category: 'IfcColumn',
            structuralGrid: `Grid ${String.fromCharCode(65 + x)}-${z + 1}`,
            mixDesign: 'M35 Self-Compacting Concrete (IS 456)',
            rebarSchedule: '8-T25 Fe550D Verticals + 8mm @ 100c/c Stirrups',
          };
          col.userData = colData;
          elementsGroup.add(col);
          raycastableMeshes.push(col);

          if (x < 2) {
            const beamX = new THREE.Mesh(beamGeoX, concreteMat.clone());
            beamX.position.set(colX + 3, yOffset + 3.8, colZ);
            elementsGroup.add(beamX);
          }
          if (z < 2) {
            const beamZ = new THREE.Mesh(beamGeoZ, concreteMat.clone());
            beamZ.position.set(colX, yOffset + 3.8, colZ + 3);
            elementsGroup.add(beamZ);
          }
        }
      }
    }

    scene.add(elementsGroup);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastableMeshes);

      raycastableMeshes.forEach((mesh) => {
        mesh.material = concreteMat;
      });

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        clickedMesh.material = highlightMat;
        const data = clickedMesh.userData as SelectedElementData;
        setSelectedElement(data);
        if (onElementSelected) onElementSelected(data);
      } else {
        setSelectedElement(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    let angle = 0.8;
    let reqId: number;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      angle += 0.0015;
      camera.position.x = 22 * Math.cos(angle);
      camera.position.z = 22 * Math.sin(angle);
      camera.lookAt(6, 4, 6);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[650px] bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden flex flex-col font-mono">
      <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Box className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-neutral-200">{modelName}</span>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
            LOD 350 PARAMETRIC
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveDiscipline(activeDiscipline === 'STRUCTURAL' ? 'ALL' : 'STRUCTURAL')}
            className="flex items-center gap-1.5 text-xs text-neutral-300 bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700 hover:border-neutral-500"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{activeDiscipline}</span>
          </button>
        </div>
      </div>

      <div ref={mountRef} className="relative flex-1 cursor-grab active:cursor-grabbing" />

      {selectedElement && (
        <div className="absolute top-14 right-4 w-80 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg p-4 shadow-2xl z-20">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {selectedElement.name}
            </span>
            <span className="text-[10px] text-neutral-500">{selectedElement.category}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-neutral-500 block text-[10px]">IFC GUID</span>
              <span className="text-emerald-400 font-mono text-[11px] break-all">{selectedElement.guid}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">SPATIAL GRID</span>
              <span className="text-neutral-200">{selectedElement.structuralGrid}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">SANCTIONED MIX DESIGN</span>
              <span className="text-neutral-200">{selectedElement.mixDesign}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">BAR BENDING SCHEDULE (BBS)</span>
              <span className="text-neutral-300 text-[11px]">{selectedElement.rebarSchedule}</span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-neutral-900/90 border border-neutral-800 rounded px-3 py-2 flex items-center gap-3 z-10">
        <Scissors className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-[11px] text-neutral-400">PLAN CUT (Z):</span>
        <input
          type="range"
          min="0"
          max="100"
          value={clipHeight}
          onChange={(e) => setClipHeight(Number(e.target.value))}
          className="w-28 accent-emerald-500 cursor-pointer"
        />
        <span className="text-[11px] text-emerald-400">{clipHeight}%</span>
      </div>
    </div>
  );
};

export default BimModelViewer;