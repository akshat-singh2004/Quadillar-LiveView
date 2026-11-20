// @refresh reset
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import {
  VANGUARD_GENOME,
  ArchitecturalBitSpec,
  DisciplineId,
} from "@/lib/project/vanguardGenome";
import { BIM_ZONE_REGISTRY, findBimZone } from "@/lib/grounding/bimZoneRegistry";
import {
  evaluateCampusMultiRayFusion,
  RAY_MODALITY_META,
  RayModality,
  STRUCTURE_DATUM_SPEC,
} from "@/lib/spatial/multiRayFusionEngine";
import {
  buildRevitAsBuiltDeltaPacket,
  RevitAsBuiltDeltaPacket,
} from "@/lib/bim/revitDeltaSync";
import { supabase } from "@/lib/supabaseClient";
import { useActiveProject } from "@/context/ProjectContext";
import MillimeterHeatmapHud from "@/components/bim/MillimeterHeatmapHud";
import AutonomousEscalationHud from "@/components/bim/AutonomousEscalationHud";
import RevitMolecularInspectorDrawer from "@/components/bim/RevitMolecularInspectorDrawer";
import {
  buildUnifiedVanguardRevitTwin,
  BimMolecularElement,
  UnifiedRevitTwinHandle,
} from "@/lib/bim/vanguardRevitEngine";

interface DisciplineLayerUI {
  id: DisciplineId;
  label: string;
  colorHex: string;
  active: boolean;
  meshCount: number;
}

interface SelectedElementMeta {
  zoneId?: string;
  title: string;
  ifcClass: string;
  bitCode: string;
  discipline: string;
  spec: string;
  elevation: string;
  concreteGrade?: string;
  ncrStatus?: string;
  lienStatus?: string;
  budgetOrMetric: string;
  tourZone?: string;
  hasFieldDeviation?: boolean;
}

export default function DigitalTwinBimPage() {
  const { activeProject } = useActiveProject();
  const mountRef = useRef<HTMLDivElement>(null);
  const twinHandleRef = useRef<UnifiedRevitTwinHandle | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const tweenFrameRef = useRef<number | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [xrayArch, setXrayArch] = useState(true);
  const [activeBitFocus, setActiveBitFocus] = useState<string>("ALL");
  const [activeZoneId, setActiveZoneId] = useState<string>("BIT-4-TG03");
  const [totalMeshes, setTotalMeshes] = useState(0);
  const [selectedMeta, setSelectedMeta] = useState<SelectedElementMeta | null>(null);
  const [selectedMolecularElement, setSelectedMolecularElement] =
    useState<BimMolecularElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [showSchematicDrawer, setShowSchematicDrawer] = useState(false);
  const [showHeatmapDrawer, setShowHeatmapDrawer] = useState(false);
  const [showEscalationDrawer, setShowEscalationDrawer] = useState(false);
  const [leftHudOpen, setLeftHudOpen] = useState(false);
  const [rightHudOpen, setRightHudOpen] = useState(false);
  const [autoEscalateRequested, setAutoEscalateRequested] = useState(false);
  const [deepLinkTranscript, setDeepLinkTranscript] = useState<string | undefined>(undefined);

  const [escrowLocked, setEscrowLocked] = useState<boolean>(true);
  const [escrowLienInr, setEscrowLienInr] = useState<number>(450000);
  const [activeNcrCode, setActiveNcrCode] = useState<string>("NCR-2026-STR-042");

  const [deployedSensorsByZone, setDeployedSensorsByZone] = useState<
    Record<string, RayModality[]>
  >({});
  const [reconciledAsBuiltZones, setReconciledAsBuiltZones] = useState<
    Record<string, RevitAsBuiltDeltaPacket>
  >({});

  const multiRayStates = useMemo(
    () =>evaluateCampusMultiRayFusion(deployedSensorsByZone),
    [deployedSensorsByZone]
  );

  const activeZoneFusion = useMemo(
    () =>multiRayStates.find((s) =>s.zoneId === activeZoneId) || multiRayStates[0],
    [multiRayStates, activeZoneId]
  );

  const activeAdvisories = useMemo(
    () =>multiRayStates.filter((s) =>s.advisory !== null),
    [multiRayStates]
  );

  const [layers, setLayers] = useState<DisciplineLayerUI[]>([
    { id: "STRUCTURAL", label: "Structural Slabs, Core & Girder TG-03", colorHex: "#38bdf8", active: true, meshCount: 0 },
    { id: "ARCHITECTURE", label: "Partitions, Ceilings, Pelmets, Doors & Glass", colorHex: "#f59e0b", active: true, meshCount: 0 },
    { id: "HVAC", label: "HVAC Ducts, VAV Diffusers, VRV ACs & Chillers", colorHex: "#4ade80", active: true, meshCount: 0 },
    { id: "PLUMBING", label: "Fire Hydrant Cabinets & Wet Riser Mains", colorHex: "#ef4444", active: true, meshCount: 0 },
    { id: "ELECTRICAL", label: "MDB Switchgear, Lift Core & Cable Trays", colorHex: "#c084fc", active: true, meshCount: 0 },
    { id: "SITE_PLANT", label: "Liebherr 280 EC-H Crane & QA Pins", colorHex: "#eab308", active: true, meshCount: 0 },
  ]);

  const focusCameraOn = useCallback((targetPos: [number, number, number], distance = 32) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (tweenFrameRef.current) cancelAnimationFrame(tweenFrameRef.current);

    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]);
    const startCam = camera.position.clone();
    const endCam = new THREE.Vector3(
      targetPos[0] + distance * 0.85,
      targetPos[1] + distance * 0.55,
      targetPos[2] + distance * 0.95
    );

    let step = 0;
    const totalSteps = 26;
    const tick = () => {
      step += 1;
      const t = 1 - Math.pow(1 - step / totalSteps, 3);
      controls.target.lerpVectors(startTarget, endTarget, t);
      camera.position.lerpVectors(startCam, endCam, t);
      controls.update();
      if (step < totalSteps) {
        tweenFrameRef.current = requestAnimationFrame(tick);
      }
    };
    tweenFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const focusBimZone = useCallback(
    (zoneId: string, overrideNcr?: string) => {
      const zone = findBimZone(zoneId);
      setActiveZoneId(zone.zoneId);
      setActiveBitFocus(zone.bitId);
      focusCameraOn(zone.worldPos, 24);

      const isReconciled = Boolean(reconciledAsBuiltZones[zone.zoneId]);
      const isTg03 = zone.zoneId === "BIT-4-TG03";
      const ncrLabel =
        overrideNcr ||
        (isReconciled
          ? "AS-BUILT RECONCILED (REVIT SYNCED)"
          : isTg03
          ? escrowLocked
            ? `${activeNcrCode} • CRITICAL HOLD`
            : `${activeNcrCode} • IS 456 CLEARED`
          : zone.linkedNcrId || "NOMINAL • LOD-400 VERIFIED");

      const lienLabel =
        isTg03 && !isReconciled
          ? escrowLocked
            ? `LOCKED — ₹${escrowLienInr.toLocaleString("en-IN")} Lien Active`
            : "CLEARED — ₹0 Lien (44.07 MPa Verified)"
          : "UNLOCKED — ₹0 Lien";

      setSelectedMeta({
        zoneId: zone.zoneId,
        title: zone.label,
        ifcClass: "IfcBeam / IfcBuildingStorey",
        bitCode: zone.bitId,
        discipline: "STRUCTURAL",
        spec: zone.structuralElement,
        elevation: zone.elevationLabel,
        concreteGrade: zone.concreteGrade,
        ncrStatus: ncrLabel,
        lienStatus: lienLabel,
        budgetOrMetric: ncrLabel,
        tourZone: zone.bitId,
        hasFieldDeviation: (isTg03 && escrowLocked) || zone.zoneId === "BIT-2-DOME",
      });
    },
    [activeNcrCode, escrowLienInr, escrowLocked, focusCameraOn, reconciledAsBuiltZones]
  );

  const resetFullCampusView = useCallback(() => {
    setActiveBitFocus("ALL");
    focusCameraOn([0, 14, 0], 68);
  }, [focusCameraOn]);

  useEffect(() => {
    const fetchGate = async () => {
      try {
        const res = await fetch("/api/escrow-gate", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && data.gate) {
          setEscrowLocked(data.gate.gate_status === "LOCKED");
          setEscrowLienInr(Number(data.gate.withholding_lien_inr ?? 0));
          setActiveNcrCode(data.gate.ncr_id || "NCR-2026-STR-042");
        }
      } catch {}
    };
    fetchGate();

    const channel = supabase
      .channel("bim-twin-escrow-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ncr_escrow_gates" },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            setEscrowLocked(row.gate_status === "LOCKED");
            setEscrowLienInr(Number(row.withholding_lien_inr ?? 0));
            if (row.ncr_id) setActiveNcrCode(row.ncr_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const tg03Mesh = twinHandleRef.current?.zoneMeshMap["BIT-4-TG03"];
    if (tg03Mesh) {
      const mat = tg03Mesh.material as THREE.MeshStandardMaterial;
      const isReconciled = Boolean(reconciledAsBuiltZones["BIT-4-TG03"]);
      if (isReconciled || !escrowLocked) {
        mat.color.setHex(0x10b981);
        mat.emissive.setHex(0x065f46);
        mat.emissiveIntensity = 0.55;
      } else {
        mat.color.setHex(0xef4444);
        mat.emissive.setHex(0x991b1b);
        mat.emissiveIntensity = 0.72;
      }
    }
  }, [escrowLocked, reconciledAsBuiltZones, isLoaded]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let reqId = 0;

    const width = Math.max(container.clientWidth, 400);
    const height = Math.max(container.clientHeight, 450);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060911);
    scene.fog = new THREE.FogExp2(0x060911, 0.0028);

    let grid = new THREE.GridHelper(120, 60, 0x1e293b, 0x0f172a);
    scene.add(grid);

    const applyThreeTheme = (mode: string) => {
      const isLight = mode === "claude-light";
      const bgHex = isLight ? 0xefece4 : 0x060911;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, isLight ? 0.002 : 0.0028);
      scene.remove(grid);
      grid = new THREE.GridHelper(
        120,
        60,
        isLight ? 0xc96442 : 0x1e293b,
        isLight ? 0xd8d2c5 : 0x0f172a
      );
      scene.add(grid);
    };
    applyThreeTheme(document.documentElement.getAttribute("data-theme") || "obsidian-dark");
    const onThemeEvt = (e: any) =>applyThreeTheme(e.detail);
    window.addEventListener("liveview-theme-change", onThemeEvt);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 1000);
    camera.position.set(54, 42, 58);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      logarithmicDepthBuffer: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.05));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.45);
    sunLight.position.set(60, 90, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const skyFill = new THREE.DirectionalLight(0x38bdf8, 0.6);
    skyFill.position.set(-50, 35, -45);
    scene.add(skyFill);

    // Build Single Unified Revit LOD-400 Campus & Crane Twin
    const handle = buildUnifiedVanguardRevitTwin(scene);
    twinHandleRef.current = handle;
    setTotalMeshes(handle.totalSelectableCount);
    setLayers((prev) =>
      prev.map((l) => ({ ...l, meshCount: handle.disciplineCounts[l.id] || 0 }))
    );

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: rw, height: rh } = entry.contentRect;
        if (rw >0 && rh >0) {
          camera.aspect = rw / rh;
          camera.updateProjectionMatrix();
          renderer.setSize(rw, rh);
        }
      }
    });
    resizeObserver.observe(container);

    const params = new URLSearchParams(window.location.search);
    const requestedZone = params.get("zone");
    const requestedNcr = params.get("ncr") || undefined;
    const requestedBit = params.get("bit");

    const initControls = async () => {
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (cancelled) return;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controlsRef.current = controls;

      if (requestedZone) {
        const zone = findBimZone(requestedZone);
        const [tx, ty, tz] = zone.worldPos;
        controls.target.set(tx, ty, tz);
        camera.position.set(tx + 22, ty + 15, tz + 24);
        controls.update();
        setActiveZoneId(zone.zoneId);
        setActiveBitFocus(zone.bitId);
      } else if (requestedBit) {
        const matchedBit = VANGUARD_GENOME.bits.find(
          (b) =>b.bitId === requestedBit.toUpperCase()
        );
        if (matchedBit) {
          const [tx, ty, tz] = matchedBit.worldPos;
          controls.target.set(tx, ty, tz);
          camera.position.set(tx + 26, ty + 18, tz + 28);
          controls.update();
          setActiveBitFocus(matchedBit.bitId);
        } else {
          controls.target.set(0, 14, 0);
          controls.update();
        }
      } else {
        controls.target.set(0, 14, 0);
        controls.update();
      }
      setIsLoaded(true);
    };
    initControls();

    // Molecular Raycaster with Smart X-Ray Interior Piercing
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) >6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const visibleMeshes = handle.allMeshes.filter((m) => {
        let p: THREE.Object3D | null = m;
        while (p) {
          if (!p.visible) return false;
          p = p.parent;
        }
        return true;
      });

      const hits = raycaster.intersectObjects(visibleMeshes, false);
      if (hits.length >0) {
        // When X-Ray is ON, pierce outer semi-transparent glazing/dome shell to select interior partitions, ceilings, pelmets & MEP
        const interiorHit = hits.find(
          (h) => !(h.object as THREE.Mesh).userData?.bimElement?.isOuterShell
        );
        const chosenHit = interiorHit || hits[0];
        const mesh = chosenHit.object as THREE.Mesh;
        const bimEl = mesh.userData?.bimElement as BimMolecularElement | undefined;

        handle.highlightElement(mesh);

        if (bimEl) {
          setSelectedMolecularElement(bimEl);
          setActiveZoneId(bimEl.zoneId);
          setUploadStatus(
            `Selected ${bimEl.mark} (${bimEl.ifcClass} • ${bimEl.level})`
          );
        }
        if (mesh.userData?.title) {
          setSelectedMeta(mesh.userData as SelectedElementMeta);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const t0 = performance.now();
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      handle.animate((performance.now() - t0) / 1000);
      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(reqId);
      if (tweenFrameRef.current) cancelAnimationFrame(tweenFrameRef.current);
      window.removeEventListener("liveview-theme-change", onThemeEvt);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      handle.dispose();
      twinHandleRef.current = null;
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qZone = params.get("zone");
    const qAuto = params.get("autoEscalate");
    const qNote = params.get("note");
    if (qNote) setDeepLinkTranscript(qNote);
    if (qZone) {
      setActiveZoneId(qZone);
      const zMeta = findBimZone(qZone);
      if (zMeta) setTimeout(() =>focusCameraOn(zMeta.worldPos, 26), 350);
    }
    if (qAuto === "1") {
      setShowEscalationDrawer(true);
      setAutoEscalateRequested(true);
    }
  }, [focusCameraOn]);

  const toggleLayer = (id: DisciplineId) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const next = !l.active;
          twinHandleRef.current?.setDisciplineVisibility(id, next);
          return { ...l, active: next };
        }
        return l;
      })
    );
  };

  const toggleXrayMode = () => {
    const nextXray = !xrayArch;
    setXrayArch(nextXray);
    twinHandleRef.current?.setXrayMode(nextXray);
  };

  const focusBit = (bit: ArchitecturalBitSpec) => {
    setActiveBitFocus(bit.bitId);
    const matchingZone = BIM_ZONE_REGISTRY.find((z) =>z.bitId === bit.bitId);
    if (matchingZone) setActiveZoneId(matchingZone.zoneId);
    focusCameraOn(bit.worldPos, Math.max(bit.dimensionsM[0], bit.dimensionsM[1]) * 0.95);
    setSelectedMeta({
      zoneId: matchingZone?.zoneId,
      title: `${bit.code}: ${bit.name}`,
      ifcClass: "IfcBuildingStorey / SpatialZone",
      bitCode: bit.bitId,
      discipline: "FEDERATED_LOD400",
      spec: `${bit.structuralSystem} • ${bit.mepSystem}`,
      elevation: bit.elevationLabel,
      concreteGrade: matchingZone?.concreteGrade || "M45",
      ncrStatus: bit.activeIssueId || "NOMINAL",
      lienStatus:
        bit.bitId === "BIT-4" && escrowLocked
          ? `LOCKED — ₹${escrowLienInr.toLocaleString("en-IN")} Lien Active`
          : "UNLOCKED — ₹0 Lien",
      budgetOrMetric: `₹${bit.allocatedBudgetCr.toFixed(2)} Cr • ${bit.completionPct}% Complete`,
      tourZone: bit.bitId,
      hasFieldDeviation: bit.status === "SNAG_FLAGGED" || (bit.bitId === "BIT-4" && escrowLocked),
    });
  };

  const handleDeployMissingRay = (zoneId: string, modality: RayModality) => {
    setDeployedSensorsByZone((prev) => {
      const existing = prev[zoneId] || [];
      if (existing.includes(modality)) return prev;
      return { ...prev, [zoneId]: [...existing, modality] };
    });
  };

  const handleApproveAsBuiltRevitSync = (zoneId: string) => {
    const zone = findBimZone(zoneId);
    const deltaMm: [number, number, number] =
      zoneId === "BIT-2-DOME" ? [4.2, -1.5, 0.0] : [0.0, -3.0, 2.5];
    const hash = Array.from({ length: 64 }, (_, i) =>
      ((i * 17 + zoneId.charCodeAt(i % zoneId.length)) % 16).toString(16)
    ).join("");

    const packet = buildRevitAsBuiltDeltaPacket({
      bimZoneId: zone.zoneId,
      bitCode: zone.bitId,
      ifcEntityClass: selectedMeta?.ifcClass || "IfcBeam",
      elementTitle: zone.label,
      deltaMm,
      justification:
        "Field deviation structurally verified via multi-ray fusion & engineer sign-off; committed to As-Built BIM baseline.",
      approvedBy: "CHIEF-STR-ENG-LKO",
      attestationHash: hash,
    });

    setReconciledAsBuiltZones((prev) => ({ ...prev, [zone.zoneId]: packet }));
    setSelectedMeta((prev) =>
      prev
        ? {
            ...prev,
            ncrStatus: "AS-BUILT RECONCILED (REVIT / IFC PATCH READY)",
            hasFieldDeviation: false,
          }
        : null
    );
  };

  const downloadRevitDeltaJson = (packet: RevitAsBuiltDeltaPacket) => {
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revit_ifc_asbuilt_delta_${packet.bimZoneId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExternalModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const handle = twinHandleRef.current;
    if (!file || !handle) return;

    setUploadStatus(`Parsing ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "glb" || ext === "gltf") {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        loader.parse(buffer, "", (gltf) => {
          const added = handle.registerExternalObject(gltf.scene, file.name);
          setTotalMeshes((prev) =>prev + added);
          setUploadStatus(`Mounted ${file.name} (${added} selectable Revit/GLB nodes)`);
        });
      } else if (ext === "ifc") {
        const WebIFC = await import("web-ifc");
        const ifcApi = new WebIFC.IfcAPI();
        const cdnBase = `https://unpkg.com/web-ifc@0.0.78/`;
        (ifcApi as any).SetWasmPath(cdnBase, true);
        await (ifcApi as any).Init((p: string) => `${cdnBase}${p}`);
        const modelID = ifcApi.OpenModel(new Uint8Array(buffer));
        const customGroup = new THREE.Group();
        ifcApi.StreamAllMeshes(modelID, (flatMesh: any) => {
          const geoms = flatMesh.geometries;
          for (let i = 0; i < geoms.size(); i++) {
            const placed = geoms.get(i);
            const g = ifcApi.GetGeometry(modelID, placed.geometryExpressID);
            const v = ifcApi.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize());
            const idx = ifcApi.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize());
            if (v.length && idx.length) {
              const vc = v.length / 6;
              const pos = new Float32Array(vc * 3);
              const norm = new Float32Array(vc * 3);
              for (let k = 0; k < vc; k++) {
                pos[k * 3] = v[k * 6];
                pos[k * 3 + 1] = v[k * 6 + 1];
                pos[k * 3 + 2] = v[k * 6 + 2];
                norm[k * 3] = v[k * 6 + 3];
                norm[k * 3 + 1] = v[k * 6 + 4];
                norm[k * 3 + 2] = v[k * 6 + 5];
              }
              const bg = new THREE.BufferGeometry();
              bg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
              bg.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
              bg.setIndex(new THREE.BufferAttribute(idx, 1));
              const m = new THREE.Mesh(
                bg,
                new THREE.MeshStandardMaterial({ color: 0x22d3ee, side: THREE.DoubleSide })
              );
              m.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation));
              customGroup.add(m);
            }
          }
        });
        ifcApi.CloseModel(modelID);
        const added = handle.registerExternalObject(customGroup, file.name);
        setTotalMeshes((prev) =>prev + added);
        setUploadStatus(`Mounted IFC: ${file.name} (${added} molecular IFC entities)`);
      }
    } catch (err: any) {
      setUploadStatus(`Upload error: ${err?.message || "Invalid file"}`);
    }
  };

  const activeReconciledPacket = reconciledAsBuiltZones[activeZoneId];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-950 text-zinc-100 flex flex-col font-mono">
      {/* Unified Single-Row 3D BIM Command Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950/95 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 rounded shrink-0">
            {activeProject.code} • LOD-400 ({totalMeshes} PARTS)
          </span>
          <h1 className="text-sm font-bold text-white truncate">
            {activeProject.name} — 3D Revit & Multi-Ray Twin
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <button
            type="button"
            onClick={() => {
              const target = twinHandleRef.current?.interiorFocusPos || [-10, 14.5, -13];
              twinHandleRef.current?.setXrayMode(true);
              setXrayArch(true);
              focusCameraOn(target, 16);
              setUploadStatus("Interior Cutaway Focused: Click any Room Partition, False Ceiling, Pelmet, Doorway, AC Unit, Hydrant or Panel.");
            }}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/45 text-cyan-300 font-bold transition cursor-pointer"
          >
             Interior Cutaway
          </button>

          <button
            type="button"
            onClick={() =>setShowEscalationDrawer((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
              showEscalationDrawer
                ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-400"
            }`}
          >
             Agent Escalate
          </button>

          <button
            type="button"
            onClick={() =>setShowHeatmapDrawer((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
              showHeatmapDrawer
                ? "bg-zinc-100 text-zinc-950 border-white"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200"
            }`}
          >
             mm Heatmap
          </button>

          <button
            type="button"
            onClick={() =>setShowSchematicDrawer((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
              showSchematicDrawer
                ? "bg-zinc-100 text-zinc-950 border-white"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200"
            }`}
          >
             VR & Zones
          </button>

          <label className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl font-bold cursor-pointer transition">
            + .IFC/.GLB
            <input type="file"accept=".ifc,.glb,.gltf"onChange={handleExternalModelUpload} className="hidden" />
          </label>

          <a
            href="/"
            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition"
          >
            ← Command Center
          </a>
        </div>
      </div>

      {showEscalationDrawer && (
        <div className="p-2.5 border-b border-zinc-800 bg-zinc-950">
          <AutonomousEscalationHud
            isOpen={showEscalationDrawer}
            autoTriggerOnMount={autoEscalateRequested}
            initialTranscript={deepLinkTranscript}
            onClose={() =>setShowEscalationDrawer(false)}
            activeZoneId={activeZoneId}
            onHardwareTriggered={({ zoneId, worldPos, modalities, result }) => {
              setActiveZoneId(zoneId);
              setDeployedSensorsByZone((prev) => ({
                ...prev,
                [zoneId]: Array.from(new Set([...(prev[zoneId] || []), ...modalities])),
              }));
              if (result.escrowAction === "LOCK_ESCROW_HOLD") {
                setEscrowLocked(true);
                setEscrowLienInr(result.withholdingInr);
              }
              focusCameraOn(worldPos, 24);
              setUploadStatus(`Agent Escalation Confirmed on ${zoneId}: PTZ + 905nm LiDAR + 24GHz Radar locked.`);
            }}
          />
        </div>
      )}

      {showHeatmapDrawer && (
        <div className="p-2.5 border-b border-zinc-800 bg-zinc-950">
          <MillimeterHeatmapHud />
        </div>
      )}

      {/* Slim Architectural Bits, Crane Focus & X-Ray Ribbon */}
      <div className="border-b border-zinc-800/90 bg-zinc-900/70 px-3.5 py-1.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetFullCampusView}
            className={`px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0 transition cursor-pointer ${
              activeBitFocus === "ALL"
                ? "bg-zinc-100 border-white text-zinc-950"
                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            FULL CAMPUS
          </button>

          {VANGUARD_GENOME.bits.map((bit) => {
            const isBlockedBit =
              bit.bitId === "BIT-4" && escrowLocked && !reconciledAsBuiltZones["BIT-4-TG03"];
            return (
              <button
                key={bit.bitId}
                type="button"
                onClick={() =>focusBit(bit)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  activeBitFocus === bit.bitId
                    ? "bg-zinc-100 border-white text-zinc-950"
                    : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span>{bit.code}</span>
                {(bit.status === "SNAG_FLAGGED" || isBlockedBit) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setActiveBitFocus("CRANE-01");
              focusCameraOn([-24, 48, 14], 32);
              setUploadStatus("Focused Liebherr 280 EC-H Tower Crane: Click Mast, LiCAB Cabin, Jib, Ballast or Hook Trolley.");
            }}
            className={`px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0 transition cursor-pointer ${
              activeBitFocus === "CRANE-01"
                ? "bg-amber-400 border-amber-300 text-zinc-950"
                : "bg-zinc-950 border-zinc-800 text-amber-300 hover:border-amber-500/50"
            }`}
          >
             CRANE-01
          </button>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={toggleXrayMode}
            className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold transition cursor-pointer"
          >
            {xrayArch ? "X-RAY: ON" : "SOLID FACADE"}
          </button>
          {activeAdvisories.length >0 && (
            <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
               {activeAdvisories.length} BLIND-SPOTS
            </span>
          )}
        </div>
      </div>

      {/* Full-Screen 3D WebGL Canvas & Retractable HUDs */}
      <div className="relative flex-1 w-full bg-[#060911] overflow-hidden">
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing min-h-[660px] h-[calc(100vh-8.2rem)]"
        />

        {!isLoaded && (
          <div className="absolute inset-0 bg-zinc-950/90 flex items-center justify-center z-20 text-xs text-zinc-300 font-bold">
            Compiling Unified Revit LOD-400 Structural, Interior, MEP & Crane Twin...
          </div>
        )}

        {/* Low-Bandwidth Spatial Zone Schematic & 1:1 VR Walkthrough Overlay */}
        {showSchematicDrawer && (
          <div className="absolute inset-x-4 top-3 z-30 bg-zinc-950/95 backdrop-blur-md border border-zinc-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-400">
                  SPATIAL SCHEMATIC & 1:1 META QUEST 3 / 3S VR WALKTHROUGH REFERENCE
                </div>
                <div className="text-sm font-bold text-white">
                  {STRUCTURE_DATUM_SPEC.envelopeMeters} • {STRUCTURE_DATUM_SPEC.datumLabel}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/site/vr-walkthrough"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold"
                >
                   Launch Quest 3S VR
                </a>
                <button
                  type="button"
                  onClick={() =>setShowSchematicDrawer(false)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold cursor-pointer"
                >
                  Close ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {multiRayStates.map((st) => (
                <div
                  key={st.zoneId}
                  onClick={() => {
                    focusBimZone(st.zoneId);
                    setShowSchematicDrawer(false);
                  }}
                  className="p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 cursor-pointer flex flex-col justify-between gap-2 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{st.zoneId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        st.advisory
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      CONFIDENCE {st.compositeConfidencePct}%
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-300">{st.zoneLabel}</div>
                  <div className="text-[10px] text-zinc-400">
                    Coords: [{st.worldPos.join(", ")}]m • Residual: {st.datumResidualMm}mm • Lux: {st.ambientLux} lx
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retractable Left Discipline & NCR Drawer */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-h-[calc(100%-24px)]">
          <button
            type="button"
            onClick={() =>setLeftHudOpen((v) => !v)}
            className="self-start px-3 py-1.5 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-700 text-zinc-100 text-[10.5px] font-bold shadow-lg backdrop-blur-md cursor-pointer"
          >
            {leftHudOpen ? "✕ Hide Layers & NCRs" : `☰ Layers & NCRs (${totalMeshes})`}
          </button>

          {leftHudOpen && (
            <div className="flex flex-col gap-2 w-72 bg-zinc-950/92 backdrop-blur-md p-3 rounded-2xl border border-zinc-800 shadow-2xl overflow-y-auto">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                REVIT DISCIPLINE VISIBILITY
              </span>
              <div className="flex flex-col gap-1">
                {layers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() =>toggleLayer(layer.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                      layer.active
                        ? "bg-zinc-900 border-zinc-700 text-white"
                        : "bg-zinc-950/50 border-zinc-900 text-zinc-500"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: layer.active ? layer.colorHex : "#52525b" }}
                      />
                      <span className="truncate">{layer.label}</span>
                    </div>
                    <span className="text-[10px] shrink-0 text-zinc-400">{layer.meshCount}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 mt-1 border-t border-zinc-800 flex flex-col gap-1.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  PINNED NCR & SPATIAL TELEMETRY
                </span>

                <button
                  type="button"
                  onClick={() =>focusBimZone("BIT-4-TG03", activeNcrCode)}
                  className={`text-left px-2.5 py-2 rounded-xl border text-[10px] flex flex-col gap-0.5 transition cursor-pointer ${
                    escrowLocked && !reconciledAsBuiltZones["BIT-4-TG03"]
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                      : "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                  }`}
                >
                  <div className="flex justify-between items-center font-bold">
                    <span>{activeNcrCode} (TG-03)</span>
                    <span>{escrowLocked ? "₹4.50L HOLD" : "CLEARED"}</span>
                  </div>
                  <span className="text-[9px] text-zinc-400">
                    Tower A / BIT-4 Level 3 Transfer Girder (M50)
                  </span>
                </button>

                {VANGUARD_GENOME.spatialPins.map((pin) => {
                  const targetZone =
                    pin.bitId === "BIT-4"
                      ? "BIT-4-TG03"
                      : pin.bitId === "BIT-2"
                      ? "BIT-2-DOME"
                      : pin.bitId === "BIT-3"
                      ? "BIT-3-CORE"
                      : "BIT-1-ARCH";
                  return (
                    <button
                      key={pin.pinId}
                      type="button"
                      onClick={() =>focusBimZone(targetZone, pin.pinId)}
                      className="text-left px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 text-[10px] flex justify-between items-center cursor-pointer"
                    >
                      <span className="text-zinc-200 font-bold truncate pr-2">{pin.pinId}</span>
                      <span
                        className={
                          pin.severity === "MINOR"
                            ? "text-rose-400 font-bold"
                            : pin.severity === "RESOLVED_CERTIFIED"
                            ? "text-emerald-400 font-bold"
                            : "text-zinc-300"
                        }
                      >
                        {pin.metricLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Retractable Right Multi-Ray & As-Built Reconciliation HUD */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 max-h-[calc(100%-24px)]">
          <button
            type="button"
            onClick={() =>setRightHudOpen((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-700 text-zinc-100 text-[10.5px] font-bold shadow-lg backdrop-blur-md cursor-pointer"
          >
            {rightHudOpen ? "✕ Hide Multi-Ray HUD" : "Multi-Ray & As-Built HUD"}
          </button>

          {rightHudOpen && (
            <div className="flex flex-col gap-2.5 w-80 bg-zinc-950/92 backdrop-blur-md p-3.5 rounded-2xl border border-zinc-800 shadow-2xl overflow-y-auto">
              {selectedMeta && (
                <div className="flex flex-col gap-2 border-b border-zinc-800 pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] font-bold">
                      {selectedMeta.bitCode} • {selectedMeta.discipline}
                    </span>
                    <button
                      type="button"
                      onClick={() =>setSelectedMeta(null)}
                      className="text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-sm font-bold text-white leading-snug">{selectedMeta.title}</div>
                  <div className="text-[11px] text-zinc-300 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
                    {selectedMeta.spec}
                  </div>

                  {(selectedMeta.hasFieldDeviation || activeReconciledPacket) && (
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-zinc-100">REVIT / IFC AS-BUILT PATCH</span>
                        <span className="text-emerald-400 font-bold">
                          {activeReconciledPacket ? "SYNCED" : "DELTA DETECTED"}
                        </span>
                      </div>
                      {!activeReconciledPacket ? (
                        <button
                          type="button"
                          onClick={() =>handleApproveAsBuiltRevitSync(activeZoneId)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-[10px] transition cursor-pointer"
                        >
                          Approve Field Variation & Emit Revit Patch
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>downloadRevitDeltaJson(activeReconciledPacket)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] hover:bg-emerald-500/30 transition cursor-pointer"
                        >
                          Download Revit Dynamo / IFC Patch (.json)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeZoneFusion && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                      MULTI-RAY FUSION ({activeZoneFusion.zoneId})
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        activeZoneFusion.compositeConfidencePct >= 85
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {activeZoneFusion.compositeConfidencePct}% MAPPED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {(Object.keys(RAY_MODALITY_META) as RayModality[]).map((mod) => {
                      const cov = activeZoneFusion.rayCoverage[mod];
                      return (
                        <div
                          key={mod}
                          className={`p-2 rounded-xl border ${
                            cov.active
                              ? "bg-zinc-900/90 border-zinc-800 text-zinc-200"
                              : "bg-amber-500/10 border-amber-500/35 text-amber-200"
                          }`}
                        >
                          <div className="flex justify-between font-bold">
                            <span>{RAY_MODALITY_META[mod].shortLabel}</span>
                            <span>{cov.coveragePct}%</span>
                          </div>
                          <div className="text-[9px] text-zinc-400 truncate mt-0.5">
                            {cov.sourceTag}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeZoneFusion.advisory && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex flex-col gap-2 text-[10px]">
                      <div className="font-bold text-amber-300">
                         NEEDS MORE DATA: {activeZoneFusion.advisory.blindSpotType.replace(/_/g, " ")}
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        {activeZoneFusion.advisory.diagnosticReason}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeployMissingRay(
                            activeZoneFusion.zoneId,
                            activeZoneFusion.advisory!.missingModality
                          )
                        }
                        className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition cursor-pointer"
                      >
                        + Deploy {RAY_MODALITY_META[activeZoneFusion.advisory.missingModality].shortLabel}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Molecular Revit Element Properties & Ecosystem Action Drawer */}
        {selectedMolecularElement && (
          <div className="absolute bottom-11 left-3 z-20">
            <RevitMolecularInspectorDrawer
              element={selectedMolecularElement}
              onClose={() => {
                twinHandleRef.current?.highlightElement(null);
                setSelectedMolecularElement(null);
              }}
              onFocusElement={(pos) =>focusCameraOn(pos, 14)}
              onEscalateHardware={(el) => {
                setDeepLinkTranscript(
                  `Inspect ${el.mark} (${el.name} • ${el.revitFamily}) at ${el.level} ${el.gridline}`
                );
                setShowEscalationDrawer(true);
              }}
            />
          </div>
        )}

        {uploadStatus && (
          <div className="absolute bottom-3 left-3 z-10 bg-zinc-950/90 border border-zinc-800 text-zinc-200 px-3 py-1 rounded-xl text-[10.5px]">
            {uploadStatus}
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-10 text-[10px] text-zinc-400 bg-zinc-950/85 px-2.5 py-1 rounded-lg border border-zinc-800">
          Revit LOD-400 Unified Engine • Click Any Partition, Ceiling, Pelmet, Door, MEP or Crane Part
        </div>
      </div>
    </div>
  );
}
