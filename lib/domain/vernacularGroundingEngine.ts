import {
  VANGUARD_CLEAN_POUR_FIXTURE,
  evaluateFiveWayTriangulation,
  type TriangulationInput,
  type TriangulationReport,
} from "@/lib/domain/triangulationEngine";

export type SupportedLanguageCode = "hi-IN" | "hi-Latn" | "en-IN";
export type IfcStructuralClass = "IfcBeam" | "IfcColumn" | "IfcSlab" | "IfcFooting";

export interface BimZoneBinding {
  zoneId: string;
  bimGlobalId: string;
  ifcClass: IfcStructuralClass;
  elementLabel: string;
}

export interface GroundedFieldExtraction {
  detectedLanguage: SupportedLanguageCode;
  englishSummary: string;
  challanNo: string;
  vehiclePlate: string;
  vendorName: string;
  bimBinding: BimZoneBinding;
  challanVolumeM3: number;
  claimedGradeMpa: number;
  claimedCementBags: number;
  weighbridgeNetKg: number;
  plcBatchVolumeM3: number;
  plcCementKg: number;
  plcWaterCementRatio: number;
  bimDesignVolumeM3: number;
  inSituEstimatedMpa: number;
  extractionSignals: string[];
}

export interface VernacularGroundingResult {
  projectId: string;
  extractorMode: "gemini_multimodal_json" | "deterministic_vernacular_fallback";
  modelUsed: string;
  extraction: GroundedFieldExtraction;
  triangulation: TriangulationReport;
  ifcRecord: {
    schema: "IFC4X3_ADD2";
    globalId: string;
    ifcClass: IfcStructuralClass;
    zoneId: string;
    elementLabel: string;
    complianceStatus: "PASS_200" | "HOLD_422";
    trustScorePct: number;
    discrepancyCodes: string[];
  };
}

export interface VernacularFieldPreset {
  presetId: "HINGLISH_FRAUD_POUR" | "HINDI_DEVANAGARI_CEMENT_SHORTAGE" | "CLEAN_SITE_ENGLISH_POUR";
  label: string;
  language: SupportedLanguageCode;
  transcript: string;
  expectedHttpStatus: 200 | 422;
}

export const VERNACULAR_FIELD_PRESETS: VernacularFieldPreset[] = [
  {
    presetId: "HINGLISH_FRAUD_POUR",
    label: "Hinglish Voice Note — Ghost Volume + Water Adulteration (TG-03)",
    language: "hi-Latn",
    transcript:
      "Sir TG-03 Transfer Girder pour mein CHLN-HINGLISH-422 aaya hai UP32-KT-4220 se. Challan mein 42 cum M50 aur 355 bori cement likha hai, par kanta weighbridge pe weight 90720 kg aaya aur PLC mein sirf 13800 kg cement aur paani zyada mila diya w/c 0.56. Rebound test 36.4 MPa aa raha hai.",
    expectedHttpStatus: 422,
  },
  {
    presetId: "HINDI_DEVANAGARI_CEMENT_SHORTAGE",
    label: "Hindi Devanagari Note — Raft Cement Shortage (Clause 42)",
    language: "hi-IN",
    transcript:
      "साहब राफ्ट फाउंडेशन पर चालान 40 घन मीटर M40 का है और 340 बोरी सीमेंट बोला गया, लेकिन प्लांट में सिर्फ 13500 kg सीमेंट डाला और पानी ज्यादा मिला दिया है।",
    expectedHttpStatus: 422,
  },
  {
    presetId: "CLEAN_SITE_ENGLISH_POUR",
    label: "English Site Report — Verified Clean Slab Pour",
    language: "en-IN",
    transcript:
      "Tower Slab pour complete on CHLN-CLEAN-108 vehicle UP32-AB-1102. Challan 38 m3 M50 with 320 bags cement. Weighbridge weight 91200 kg, PLC actual 16000 kg cement, w/c 0.40, rebound strength 52.4 MPa.",
    expectedHttpStatus: 200,
  },
];

export function detectVernacularLanguage(text: string): SupportedLanguageCode {
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  if (
    /\b(sir|sahab|mein|aaya|hai|par|kanta|kaanta|bori|paani|pani|zyada|sirf|likha|mila|diya|bol|raha|bhej)\b/i.test(
      text
    )
  ) {
    return "hi-Latn";
  }
  return "en-IN";
}

export function resolveBimZoneBinding(text: string, fallbackZoneId = "BIT-4-TG03"): BimZoneBinding {
  const t = text || "";

  if (/(tg[\s-]*0?3|transfer\s*girder|girder|beam|बीम|गर्डर)/i.test(t)) {
    return {
      zoneId: "BIT-4-TG03",
      bimGlobalId: "2O2Fr$t4X7Zf8NOew3FL9r",
      ifcClass: "IfcBeam",
      elementLabel: "Tower Core Transfer Girder TG-03",
    };
  }
  if (/(raft|footing|foundation|pile\s*cap|राफ्ट|नींव|फाउंडेशन)/i.test(t)) {
    return {
      zoneId: "RAFT-FND-01",
      bimGlobalId: "1R8Ft$k2M9Lp4NOew3FT1a",
      ifcClass: "IfcFooting",
      elementLabel: "Mass Concrete Raft Foundation Section",
    };
  }
  if (/(column|pillar|stambh|कॉलम|पिलर|खंभा)/i.test(t)) {
    return {
      zoneId: "COL-L03-C04",
      bimGlobalId: "0C6Lm$q8N4Bv2NOew3CL4b",
      ifcClass: "IfcColumn",
      elementLabel: "Tower Structural Column Grid C4",
    };
  }
  if (/(slab|deck|roof|chhat|स्लैब|छत)/i.test(t)) {
    return {
      zoneId: "SLAB-L04-S02",
      bimGlobalId: "3S4Lb$p9X2Zq7NOew3SL8c",
      ifcClass: "IfcSlab",
      elementLabel: "Level 4 Post-Tensioned Deck Slab",
    };
  }

  return {
    zoneId: fallbackZoneId,
    bimGlobalId: "2O2Fr$t4X7Zf8NOew3FL9r",
    ifcClass: "IfcBeam",
    elementLabel: `Site Structural Zone ${fallbackZoneId}`,
  };
}

export function extractGroundTruthDeterministic(
  transcript: string,
  options?: { projectId?: string; defaultZoneId?: string }
): GroundedFieldExtraction {
  const text = (transcript || "").trim();
  const signals: string[] = [];
  const detectedLanguage = detectVernacularLanguage(text);
  const bimBinding = resolveBimZoneBinding(text, options?.defaultZoneId || "BIT-4-TG03");

  // 1. Challan & Vehicle Plate
  const challanMatch = text.match(/\b((?:CHLN|INV|DC)[A-Z0-9-]{2,24})\b/i);
  const challanNo = challanMatch ? challanMatch[1].toUpperCase() : "CHLN-FIELD-VERN-01";
  if (challanMatch) signals.push(`Challan=${challanNo}`);

  const plateMatch = text.match(/\b([A-Z]{2}\s?-?\d{2}\s?-?[A-Z]{1,2}\s?-?\d{3,4})\b/i);
  const vehiclePlate = plateMatch ? plateMatch[1].toUpperCase().replace(/\s+/g, "") : "UP32-FIELD-001";
  if (plateMatch) signals.push(`Plate=${vehiclePlate}`);

  // 2. Concrete Grade (M20..M60)
  const gradeMatches = Array.from(text.matchAll(/\bM\s*-?\s*(20|25|30|35|40|45|50|55|60)\b/gi)).map(
    (m) => Number(m[1])
  );
  const claimedGradeMpa = gradeMatches[0] ?? 50;
  if (gradeMatches.length > 0) signals.push(`Grade=M${claimedGradeMpa}`);

  // 3. Challan Volume (m3 / cum / घन मीटर)
  const volMatch =
    text.match(
      /(?:challan|billed|bill|pour|volume|चालान|मात्रा)[^\d]{0,28}(\d+(?:\.\d+)?)\s*(?:m3|m³|cum|cubic\s*meters?|घन\s*मीटर)/i
    ) || text.match(/(\d+(?:\.\d+)?)\s*(?:m3|m³|cum|cubic\s*meters?|घन\s*मीटर)/i);
  const challanVolumeM3 = volMatch ? Number(volMatch[1]) : VANGUARD_CLEAN_POUR_FIXTURE.challanVolumeM3;
  if (volMatch) signals.push(`ChallanVol=${challanVolumeM3}m3`);

  // 4. Weighbridge Net Weight (kg / ton) or Weighbridge Derived Volume
  let weighbridgeNetKg = Math.round(challanVolumeM3 * 2400);
  const wbWeightMatch = text.match(
    /(?:weighbridge|kanta|kaanta|weight|wazan|कांटा|वजन)[^\d]{0,28}(\d+(?:\.\d+)?)\s*(kg|kgs|ton|tons|tonne|mt)\b/i
  );
  const wbVolMatch = text.match(
    /(?:weighbridge|kanta|kaanta|कांटा)[^\d]{0,28}(\d+(?:\.\d+)?)\s*(?:m3|m³|cum|घन\s*मीटर)/i
  );
  if (wbWeightMatch) {
    const val = Number(wbWeightMatch[1]);
    const unit = wbWeightMatch[2].toLowerCase();
    weighbridgeNetKg = unit.startsWith("kg") ? Math.round(val) : Math.round(val * 1000);
    signals.push(`Weighbridge=${weighbridgeNetKg}kg`);
  } else if (wbVolMatch) {
    weighbridgeNetKg = Math.round(Number(wbVolMatch[1]) * 2400);
    signals.push(`Weighbridge=${weighbridgeNetKg}kg`);
  }

  // 5. Claimed Cement Bags (bori / bags / बोरी)
  const claimedBagsMatch =
    text.match(/(?:claimed|challan|billed|likha|bola|बोला|चालान)[^\d]{0,32}(\d+)\s*(?:bags?|bori|बोरी)/i) ||
    text.match(/(\d+)\s*(?:bags?|bori|बोरी)/i);
  const claimedCementBags = claimedBagsMatch
    ? Number(claimedBagsMatch[1])
    : Math.round(challanVolumeM3 * 8.4);
  if (claimedBagsMatch) signals.push(`ClaimedCement=${claimedCementBags}bags`);

  // 6. Actual PLC Cement (kg or bags)
  let plcCementKg = claimedCementBags * 50;
  const plcCementMatch = text.match(
    /(?:plc|plant|actual|sirf|only|डाला|सिर्फ|प्लांट)[^\d]{0,32}(\d+(?:\.\d+)?)\s*(kg|kgs|bags?|bori|बोरी)/i
  );
  if (plcCementMatch) {
    const val = Number(plcCementMatch[1]);
    const unit = plcCementMatch[2].toLowerCase();
    plcCementKg = unit.startsWith("kg") ? Math.round(val) : Math.round(val * 50);
    signals.push(`PlcCement=${plcCementKg}kg`);
  }

  // 7. Water-Cement Ratio (numeric OR Hinglish/Hindi water-addition flag)
  let plcWaterCementRatio = 0.4;
  const wcMatch = text.match(/(?:w\s*\/\s*c|water[\s-]*cement|wc)[^\d]{0,16}(0\.\d{2})/i);
  const waterAdulteration =
    /(?:paani\s*zyada|pani\s*zyada|paani\s*mila|pani\s*mila|excess\s*water|water\s*added|पानी\s*ज्यादा|पानी\s*मिला)/i.test(
      text
    );
  if (wcMatch) {
    plcWaterCementRatio = Number(wcMatch[1]);
    signals.push(`W/C=${plcWaterCementRatio}`);
  } else if (waterAdulteration) {
    plcWaterCementRatio = 0.56;
    signals.push("WaterAdulterationFlag->W/C=0.56");
  }

  // 8. In-Situ / Rebound / Core Strength (MPa)
  let inSituEstimatedMpa = claimedGradeMpa * 1.03;
  const mpaMatch = text.match(
    /(?:rebound|core|in-?situ|strength|test|actual|मजबूती|कोर|रिबाउंड)[^\d]{0,28}(\d+(?:\.\d+)?)\s*mpa/i
  );
  if (mpaMatch) {
    inSituEstimatedMpa = Number(mpaMatch[1]);
    signals.push(`InSitu=${inSituEstimatedMpa}MPa`);
  } else if (gradeMatches.length >= 2 && gradeMatches[1] < gradeMatches[0]) {
    inSituEstimatedMpa = gradeMatches[1];
    signals.push(`DowngradedMix=M${inSituEstimatedMpa}`);
  } else {
    inSituEstimatedMpa = Math.round(inSituEstimatedMpa * 10) / 10;
  }

  return {
    detectedLanguage,
    englishSummary: `Grounded ${detectedLanguage} field report on ${bimBinding.zoneId} (${bimBinding.ifcClass}): ${challanVolumeM3} m³ M${claimedGradeMpa}, weighbridge ${weighbridgeNetKg} kg, PLC cement ${plcCementKg} kg, w/c ${plcWaterCementRatio}, est. ${inSituEstimatedMpa} MPa.`,
    challanNo,
    vehiclePlate,
    vendorName: "Field Grounded RMC Supplier",
    bimBinding,
    challanVolumeM3,
    claimedGradeMpa,
    claimedCementBags,
    weighbridgeNetKg,
    plcBatchVolumeM3: challanVolumeM3,
    plcCementKg,
    plcWaterCementRatio,
    bimDesignVolumeM3: challanVolumeM3,
    inSituEstimatedMpa,
    extractionSignals: signals,
  };
}

export function evaluateVernacularGrounding(params: {
  projectId: string;
  extraction: GroundedFieldExtraction;
  extractorMode: VernacularGroundingResult["extractorMode"];
  modelUsed: string;
}): VernacularGroundingResult {
  const e = params.extraction;
  const triInput: TriangulationInput = {
    ...VANGUARD_CLEAN_POUR_FIXTURE,
    projectId: params.projectId,
    zoneId: e.bimBinding.zoneId,
    challanNo: e.challanNo,
    vendorName: e.vendorName,
    challanVolumeM3: e.challanVolumeM3,
    claimedGradeMpa: e.claimedGradeMpa,
    claimedCementBags: e.claimedCementBags,
    weighbridgeNetKg: e.weighbridgeNetKg,
    plcBatchVolumeM3: e.plcBatchVolumeM3,
    plcCementKg: e.plcCementKg,
    plcWaterCementRatio: e.plcWaterCementRatio,
    bimDesignVolumeM3: e.bimDesignVolumeM3,
    inSituEstimatedMpa: e.inSituEstimatedMpa,
  };

  const triangulation = evaluateFiveWayTriangulation(triInput);
  return {
    projectId: params.projectId,
    extractorMode: params.extractorMode,
    modelUsed: params.modelUsed,
    extraction: e,
    triangulation,
    ifcRecord: {
      schema: "IFC4X3_ADD2",
      globalId: e.bimBinding.bimGlobalId,
      ifcClass: e.bimBinding.ifcClass,
      zoneId: e.bimBinding.zoneId,
      elementLabel: e.bimBinding.elementLabel,
      complianceStatus: triangulation.httpStatus === 422 ? "HOLD_422" : "PASS_200",
      trustScorePct: triangulation.trustScorePct,
      discrepancyCodes: triangulation.discrepancies.map((d) => d.code),
    },
  };
}
