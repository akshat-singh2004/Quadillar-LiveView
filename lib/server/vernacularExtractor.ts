import { parseImageDataUrl } from "@/lib/repositories/fieldEvidenceRepo";
import {
  extractGroundTruthDeterministic,
  resolveBimZoneBinding,
  type GroundedFieldExtraction,
  type SupportedLanguageCode,
} from "@/lib/domain/vernacularGroundingEngine";

export const PRIMARY_GROUNDING_MODEL =
  process.env.GEMINI_GROUNDING_MODEL?.trim() || "gemini-4-hydrogen";
export const FALLBACK_GROUNDING_MODEL = "gemini-3.5-flash-lite";

const EXTRACTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    detectedLanguage: { type: "STRING", enum: ["hi-IN", "hi-Latn", "en-IN"] },
    englishSummary: { type: "STRING" },
    challanNo: { type: "STRING" },
    vehiclePlate: { type: "STRING" },
    vendorName: { type: "STRING" },
    zoneHint: { type: "STRING" },
    challanVolumeM3: { type: "NUMBER" },
    claimedGradeMpa: { type: "NUMBER" },
    claimedCementBags: { type: "NUMBER" },
    weighbridgeNetKg: { type: "NUMBER" },
    plcCementKg: { type: "NUMBER" },
    plcWaterCementRatio: { type: "NUMBER" },
    inSituEstimatedMpa: { type: "NUMBER" },
  },
  required: [
    "detectedLanguage",
    "englishSummary",
    "challanVolumeM3",
    "claimedGradeMpa",
    "weighbridgeNetKg",
    "plcCementKg",
    "plcWaterCementRatio",
    "inSituEstimatedMpa",
  ],
};

function parseAudioDataUrl(dataUrl?: string | null): { mimeType: string; base64: string } | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = dataUrl
    .trim()
    .match(/^data:(audio\/(?:webm|mp4|mpeg|mp3|wav|ogg));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!m) return null;
  const base64 = m[2].replace(/\s+/g, "");
  if (base64.length > 8 * 1024 * 1024) return null;
  return { mimeType: m[1].toLowerCase(), base64 };
}

function posNum(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getVernacularExtractorStatus() {
  const apiKeyConfigured = Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
  return {
    geminiConfigured: apiKeyConfigured,
    primaryModel: PRIMARY_GROUNDING_MODEL,
    fallbackModel: FALLBACK_GROUNDING_MODEL,
    supportedLanguages: ["hi-IN", "hi-Latn", "en-IN"],
    multimodalInputs: ["text_transcript", "challan_image_base64", "voice_audio_base64"],
  };
}

export async function extractVernacularFieldReport(params: {
  transcript?: string;
  challanImageDataUrl?: string | null;
  audioDataUrl?: string | null;
  projectId: string;
  defaultZoneId?: string;
  useAi?: boolean;
}): Promise<{
  extraction: GroundedFieldExtraction;
  extractorMode: "gemini_multimodal_json" | "deterministic_vernacular_fallback";
  modelUsed: string;
}> {
  const baseline = extractGroundTruthDeterministic(params.transcript || "", {
    projectId: params.projectId,
    defaultZoneId: params.defaultZoneId,
  });

  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  // Respect explicit deterministic mode or offline/missing key gracefully
  if (params.useAi === false || !apiKey) {
    return {
      extraction: baseline,
      extractorMode: "deterministic_vernacular_fallback",
      modelUsed: "deterministic-regex-ifc-v1",
    };
  }

  const parts: Array<Record<string, unknown>> = [
    {
      text: [
        "Extract Indian construction site pour & concrete challan governance metrics into JSON.",
        "Input may be Hindi Devanagari, Hinglish, English, a paper RMC challan photo, or a site voice clip.",
        "Convert metric tons to kg (1 ton = 1000 kg) and 50 kg bags to kg when reporting plcCementKg.",
        "If water adulteration ('paani zyada' / 'पानी ज्यादा') is reported without a number, set plcWaterCementRatio to 0.56.",
        `Project: ${params.projectId}. Default zone: ${params.defaultZoneId || "BIT-4-TG03"}.`,
        params.transcript ? `Transcript: ${params.transcript}` : "Transcript: (see attached media)",
      ].join("\n"),
    },
  ];

  if (params.challanImageDataUrl) {
    const parsedImg = parseImageDataUrl(params.challanImageDataUrl);
    if (parsedImg.ok) {
      parts.push({
        inlineData: {
          mimeType: parsedImg.image.mimeType,
          data: parsedImg.image.buffer.toString("base64"),
        },
      });
    }
  }

  const parsedAudio = parseAudioDataUrl(params.audioDataUrl);
  if (parsedAudio) {
    parts.push({
      inlineData: {
        mimeType: parsedAudio.mimeType,
        data: parsedAudio.base64,
      },
    });
  }

  for (const model of [PRIMARY_GROUNDING_MODEL, FALLBACK_GROUNDING_MODEL]) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: EXTRACTION_RESPONSE_SCHEMA,
          },
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) continue;

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const zoneText = `${String(parsed.zoneHint || "")} ${params.transcript || ""}`;
      const bimBinding = resolveBimZoneBinding(zoneText, params.defaultZoneId || "BIT-4-TG03");
      const challanVolumeM3 = posNum(parsed.challanVolumeM3, baseline.challanVolumeM3);
      const lang = String(parsed.detectedLanguage || baseline.detectedLanguage);
      const detectedLanguage: SupportedLanguageCode =
        lang === "hi-IN" || lang === "hi-Latn" || lang === "en-IN"
          ? lang
          : baseline.detectedLanguage;

      return {
        extractorMode: "gemini_multimodal_json",
        modelUsed: model,
        extraction: {
          detectedLanguage,
          englishSummary:
            typeof parsed.englishSummary === "string" && parsed.englishSummary.trim()
              ? parsed.englishSummary.trim().slice(0, 320)
              : baseline.englishSummary,
          challanNo:
            typeof parsed.challanNo === "string" && parsed.challanNo.trim()
              ? parsed.challanNo.trim().toUpperCase().slice(0, 32)
              : baseline.challanNo,
          vehiclePlate:
            typeof parsed.vehiclePlate === "string" && parsed.vehiclePlate.trim()
              ? parsed.vehiclePlate.trim().toUpperCase().slice(0, 24)
              : baseline.vehiclePlate,
          vendorName:
            typeof parsed.vendorName === "string" && parsed.vendorName.trim()
              ? parsed.vendorName.trim().slice(0, 80)
              : baseline.vendorName,
          bimBinding,
          challanVolumeM3,
          claimedGradeMpa: posNum(parsed.claimedGradeMpa, baseline.claimedGradeMpa),
          claimedCementBags: posNum(parsed.claimedCementBags, baseline.claimedCementBags),
          weighbridgeNetKg: posNum(parsed.weighbridgeNetKg, baseline.weighbridgeNetKg),
          plcBatchVolumeM3: challanVolumeM3,
          plcCementKg: posNum(parsed.plcCementKg, baseline.plcCementKg),
          plcWaterCementRatio: posNum(parsed.plcWaterCementRatio, baseline.plcWaterCementRatio),
          bimDesignVolumeM3: challanVolumeM3,
          inSituEstimatedMpa: posNum(parsed.inSituEstimatedMpa, baseline.inSituEstimatedMpa),
          extractionSignals: [...baseline.extractionSignals, `AI=${model}`],
          hasRequiredConstructionSignal: true,
          droppedNoiseHints: baseline.droppedNoiseHints,
        },
      };
    } catch {
      // Try fallback model or deterministic engine cleanly
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    extraction: baseline,
    extractorMode: "deterministic_vernacular_fallback",
    modelUsed: "deterministic-regex-ifc-v1",
  };
}
