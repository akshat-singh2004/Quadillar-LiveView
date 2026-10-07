import fs from 'fs';

const viewerCode = `'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
} from 'lucide-react';

export interface PanoramaPin {
  id: string;
  pin_type: 'NCR_DEFECT' | 'RFI_CLARIFICATION' | 'SAFETY_HAZARD' | 'VERIFIED_OK';
  title: string;
  description?: string;
  sphere_yaw: number;
  sphere_pitch: number;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
}

export interface PanoramaViewer360Props {
  photoUrl: string;
  bimRenderUrl?: string | null;
  pins?: PanoramaPin[];
  onPinClick?: (pin: PanoramaPin) => void;
  onSphereClickAddPin?: (yaw: number, pitch: number) => void;
  initialYaw?: number;
  initialPitch?: number;
}

export const PanoramaViewer360: React.FC<PanoramaViewer360Props> = ({
  photoUrl,
  bimRenderUrl,
  pins = [],
  onPinClick,
  onSphereClickAddPin,
  initialYaw = 0,
  initialPitch = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [crossfadeRatio, setCrossfadeRatio] = useState<number>(0);
  const [activePinDetail, setActivePinDetail] = useState<PanoramaPin | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereMeshRef = useRef<THREE.Mesh | null>(null);

  const lonRef = useRef<number>(initialYaw);
  const latRef = useRef<number>(initialPitch);
  const isUserInteractingRef = useRef<boolean>(false);
  const onPointerDownPointerXRef = useRef<number>(0);
  const onPointerDownPointerYRef = useRef<number>(0);
  const onPointerDownLonRef = useRef<number>(0);
  const onPointerDownLatRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    const photoTexture = textureLoader.load(photoUrl);
    photoTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: photoTexture,
      transparent: true,
      opacity: 1.0,
    });

    const sphereMesh = new THREE.Mesh(geometry, material);
    sphereMeshRef.current = sphereMesh;
    scene.add(sphereMesh);

    const onPointerDown = (event: PointerEvent) => {
      if (event.isPrimary === false) return;
      isUserInteractingRef.current = true;
      onPointerDownPointerXRef.current = event.clientX;
      onPointerDownPointerYRef.current = event.clientY;
      onPointerDownLonRef.current = lonRef.current;
      onPointerDownLatRef.current = latRef.current;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.isPrimary === false || !isUserInteractingRef.current) return;
      lonRef.current = (onPointerDownPointerXRef.current - event.clientX) * 0.15 + onPointerDownLonRef.current;
      latRef.current = (event.clientY - onPointerDownPointerYRef.current) * 0.15 + onPointerDownLatRef.current;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.isPrimary === false) return;
      const movedDistance = Math.hypot(
        event.clientX - onPointerDownPointerXRef.current,
        event.clientY - onPointerDownPointerYRef.current
      );

      isUserInteractingRef.current = false;

      if (movedDistance < 4 && onSphereClickAddPin) {
        onSphereClickAddPin(Math.round(lonRef.current % 360), Math.round(latRef.current));
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (!cameraRef.current) return;
      cameraRef.current.fov = Math.max(30, Math.min(100, cameraRef.current.fov + event.deltaY * 0.05));
      cameraRef.current.updateProjectionMatrix();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('wheel', onWheel);

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      const targetX = 500 * Math.sin(phi) * Math.cos(theta);
      const targetY = 500 * Math.cos(phi);
      const targetZ = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(targetX, targetY, targetZ);
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      photoTexture.dispose();
      geometry.dispose();
    };
  }, [photoUrl]);

  return (
    <div className="relative w-full h-[620px] bg-black border border-neutral-800 rounded-lg overflow-hidden flex flex-col font-mono select-none">
      <div ref={containerRef} className="relative flex-1 cursor-grab active:cursor-grabbing" />

      <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded border border-neutral-700/60 z-10 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-neutral-200">360° REALITY SPHERE</span>
        </div>
        <span className="text-neutral-600">|</span>
        <span className="text-[10px] text-neutral-400">DRAG TO ORBIT • SCROLL TO ZOOM</span>
      </div>

      {bimRenderUrl && (
        <div className="absolute top-3 right-3 bg-neutral-950/80 backdrop-blur-md px-3 py-2 rounded border border-neutral-700/60 z-10 flex items-center gap-3 text-xs">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-neutral-300 uppercase font-semibold">BIM Split:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={crossfadeRatio}
            onChange={(e) => setCrossfadeRatio(Number(e.target.value))}
            className="w-24 accent-cyan-400 cursor-pointer"
          />
          <span className="text-[10px] text-cyan-400 w-8">{crossfadeRatio}%</span>
        </div>
      )}

      <div className="absolute bottom-14 left-4 z-10 space-y-2 max-w-sm">
        {pins.map((pin) => (
          <div
            key={pin.id}
            onClick={() => {
              setActivePinDetail(pin);
              if (onPinClick) onPinClick(pin);
            }}
            className="p-2.5 bg-neutral-900/90 backdrop-blur-md border border-neutral-700 hover:border-emerald-500 rounded text-xs cursor-pointer transition flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  pin.pin_type === 'NCR_DEFECT' ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
              />
              <span className="font-bold text-neutral-200 truncate">{pin.title}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-neutral-950 border border-neutral-800 text-neutral-400">
              {pin.status}
            </span>
          </div>
        ))}
      </div>

      {activePinDetail && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-neutral-950/95 backdrop-blur-md border border-neutral-700 p-4 rounded-lg shadow-2xl z-20 space-y-3 text-xs">
          <div className="flex justify-between items-start border-b border-neutral-800 pb-2">
            <span className="font-bold text-neutral-100">{activePinDetail.title}</span>
            <button
              onClick={() => setActivePinDetail(null)}
              className="text-neutral-500 hover:text-neutral-300"
            >
              ✕
            </button>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            {activePinDetail.description || 'No detailed engineering notes attached.'}
          </p>
          <div className="flex justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-850">
            <span>YAW: {activePinDetail.sphere_yaw}°</span>
            <span>PITCH: {activePinDetail.sphere_pitch}°</span>
          </div>
        </div>
      )}

      <div className="h-10 bg-neutral-900/95 border-t border-neutral-800 px-4 flex items-center justify-between text-xs z-10">
        <div className="text-[10px] text-neutral-400 flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>POLAR PROJECTION (YAW / PITCH COORD LOCKED)</span>
        </div>
        <div className="text-[10px] text-neutral-500">
          THREE.JS SPHERICAL SHADER • LATENCY: 0MS
        </div>
      </div>
    </div>
  );
};

export default PanoramaViewer360;
`;
fs.writeFileSync('components/site/PanoramaViewer360.tsx', viewerCode, 'utf8');

const tourPagePath = 'app/site/360-tour/page.tsx';
if (fs.existsSync(tourPagePath)) {
  let content = fs.readFileSync(tourPagePath, 'utf8');
  content = content.replace(
    /import\s+\{\s*PanoramaViewer360\s*,\s*PanoramaPin\s*\}\s+from\s+['"]@\/components\/site\/PanoramaViewer360['"];?/,
    "import PanoramaViewer360, { PanoramaPin } from '@/components/site/PanoramaViewer360';"
  );
  content = content.replace(
    /import\s+\{\s*PanoramaViewer360\s*\}\s+from\s+['"]@\/components\/site\/PanoramaViewer360['"];?/,
    "import PanoramaViewer360, { PanoramaPin } from '@/components/site/PanoramaViewer360';"
  );
  fs.writeFileSync(tourPagePath, content, 'utf8');
}
