import { VANGUARD_GENOME, ArchitecturalBitSpec } from "@/lib/project/vanguardGenome";

export interface BimZoneTarget {
  zoneId: string;
  bitId: ArchitecturalBitSpec["bitId"];
  label: string;
  structuralElement: string;
  concreteGrade: string;
  elevationLabel: string;
  worldPos: [number, number, number];
  linkedNcrId?: string;
  defaultLienInr: number;
  aliases: string[];
}

export const BIM_ZONE_REGISTRY: BimZoneTarget[] = [
  {
    zoneId: "BIT-4-TG03",
    bitId: "BIT-4",
    label: "Tower A / BIT-4 – Level 3 Transfer Girder (M50)",
    structuralElement: "Transfer Girder TG-03 (Grid C2–C5, Level 3 Podium Deck)",
    concreteGrade: "M50",
    elevationLabel: "+4.50m RL",
    worldPos: [-6.0, 4.8, -6.0],
    linkedNcrId: "NCR-2026-STR-042",
    defaultLienInr: 450000,
    aliases: ["tower a", "level 3", "transfer girder", "girder", "tg-03", "podium", "bit-4", "column c2"],
  },
  {
    zoneId: "BIT-1-ARCH",
    bitId: "BIT-1",
    label: "BIT-1 Green Wedge – 48m Post-Tensioned Box Arch",
    structuralElement: "Post-Tensioned Box Arch Rib AR-01 (M45)",
    concreteGrade: "M45",
    elevationLabel: "+12.00m RL",
    worldPos: [-14.0, 6.0, 12.0],
    defaultLienInr: 325000,
    aliases: ["bit-1", "green wedge", "terracotta", "bridge arch", "amphitheatre", "box arch"],
  },
  {
    zoneId: "BIT-2-DOME",
    bitId: "BIT-2",
    label: "BIT-2 Silver Dome – Geodesic Space-Frame Node #14B",
    structuralElement: "Space-Frame Truss Node #14B & Kalzip Standing Seam",
    concreteGrade: "Structural Steel / M40 Ring Beam",
    elevationLabel: "+16.50m RL",
    worldPos: [16.5, 14.8, 15.2],
    linkedNcrId: "SNAG-VANGUARD-401",
    defaultLienInr: 280000,
    aliases: ["bit-2", "silver dome", "dome", "kalzip", "auditorium", "truss", "node 14b"],
  },
  {
    zoneId: "BIT-3-CORE",
    bitId: "BIT-3",
    label: "BIT-3 Hotel Core – 14th Fl RCC Shear Core & Diagrid",
    structuralElement: "RCC Shear Wall Core SW-02 & Diagrid Node (M50/Fe550D)",
    concreteGrade: "M50",
    elevationLabel: "+54.00m RL",
    worldPos: [-8.0, 27.0, -14.0],
    defaultLienInr: 450000,
    aliases: ["bit-3", "hotel core", "shear wall", "diagrid", "14th floor", "lift core", "high rise"],
  },
  {
    zoneId: "BIT-5-WING",
    bitId: "BIT-5",
    label: "BIT-5 East Wing – Composite Moment Frame (ISMB 450)",
    structuralElement: "Composite Deck Slab & ISMB 450 Girder Bay E4",
    concreteGrade: "M40 Composite",
    elevationLabel: "+28.00m RL",
    worldPos: [18.0, 14.0, -12.0],
    defaultLienInr: 240000,
    aliases: ["bit-5", "east wing", "composite", "ismb", "terracotta wing"],
  },
  {
    zoneId: "BIT-6-HELI",
    bitId: "BIT-6",
    label: "BIT-6 Slim Pad – Cantilevered Rooftop Helideck",
    structuralElement: "Cantilevered Structural Steel Box-Girder Truss Deck",
    concreteGrade: "Structural Steel E350",
    elevationLabel: "+23.00m RL",
    worldPos: [18.0, 29.2, -12.0],
    defaultLienInr: 300000,
    aliases: ["bit-6", "helipad", "helideck", "slim pad", "cantilever"],
  },
];

export const HINGLISH_CONSTRUCTION_GLOSSARY = `
INDIAN JOBSITE VERNACULAR & TRADE TERMINOLOGY GLOSSARY:
- "sariya" / "bar" / "binding" -> Reinforcement steel rebar (Fe550D) / stirrups / lap splice (IS 456 Cl. 26).
- "shuttering" / "formwork" / "centering" / "deshuttering" -> Temporary formwork & stripping time (IS 456 Cl. 11.3).
- "honeycombing" / "voids" / "gitti dikh rahi hai" -> Coarse aggregate segregation / concrete voids due to inadequate vibration (IS 456 Cl. 13.3 / Cl. 17.4.3).
- "cube fail" / "28 din ka cube" / "MPa kam aaya" -> Compressive strength cube test failure below characteristic fck (IS 456 Cl. 16 / Cl. 17.4.3).
- "cover block" / "cover kam hai" -> Insufficient nominal concrete cover to rebar exposing steel to corrosion (IS 456 Cl. 26.4).
- "slump" / "paani zyada hai" / "bleeding" -> Excess water-cement ratio / workability non-conformance (IS 456 Cl. 7).
- "vibrator" / "needle" -> Mechanical immersion compaction during pour (IS 456 Cl. 13.3).
- "grouting" / "micro-concrete" / "core cutting" -> Structural rectification & in-situ diamond core extraction (IS 456 Cl. 17.4.3).
`.trim();

export function findBimZone(zoneId: string): BimZoneTarget {
  return BIM_ZONE_REGISTRY.find((z) => z.zoneId === zoneId) || BIM_ZONE_REGISTRY[0];
}

export function buildBimSystemInstruction(): string {
  const zoneLines = BIM_ZONE_REGISTRY.map(
    (z) =>
      `- ${z.zoneId} (${z.bitId}): ${z.label} | Element: ${z.structuralElement} | Grade: ${z.concreteGrade} | Elevation: ${z.elevationLabel} | Default Escrow Lien: INR ${z.defaultLienInr} | Keywords: ${z.aliases.join(", ")}`
  ).join("\n");

  return `You are QUADMAX.AI, the deterministic Construction Operating System ingestion kernel for ${VANGUARD_GENOME.projectName} (${VANGUARD_GENOME.projectId}) in Gomti Nagar Extension, Lucknow, India.

Analyze unstructured field audio (Hindi, Hinglish, or English recorded amid site machinery noise) and/or a jobsite photograph, map it to the exact canonical 3D BIM zone, evaluate compliance against Indian Standards (IS 456:2000, IS 2911, IS 13311, CPWD), and emit a single atomic 3-agent Governance Council consensus trace.

CANONICAL BIM ZONE TREE:
${zoneLines}

${HINGLISH_CONSTRUCTION_GLOSSARY}

STRICT RULES:
1. Transcribe spoken Hindi/Hinglish verbatim in "transcript_vernacular" (if image-only, output "[Visual-only site capture — no voice track]").
2. Write a formal structural engineering log in "engineering_summary".
3. Choose "matched_bim_zone_id" strictly from the CANONICAL BIM ZONE TREE IDs above.
4. Set "confidence_score" between 0.0 and 1.0 honestly: if spatial location is vague ("upar wale beam mein" without tower/level/bit cue), score below 0.70 so the human-in-the-loop engineer pin gate triggers.
5. CRITICAL_HOLD -> "FREEZE_MILESTONE" with zone Default Escrow Lien (450000 for BIT-4-TG03 / BIT-3-CORE). MODERATE_NCR -> "FREEZE_MILESTONE" (150000) or "NO_CHANGE". ROUTINE_DPR -> "NO_CHANGE" and 0.
6. Populate all three Governance Council agents deterministically in the same response.`;
}
