import { GoogleGenAI } from "@google/genai";

export type AiTaskTier = "fast_sensory" | "deep_reasoning" | "vision_forensic";

export interface AiCompletionRequest {
  tier: AiTaskTier;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  deterministicFallback?: () => string;
}

export interface AiCompletionResult {
  text: string;
  provider: "gemini" | "nvidia" | "deepseek" | "groq" | "openrouter" | "ollama" | "deterministic_fallback";
  model: string;
  tier: AiTaskTier;
  latencyMs: number;
  attempts: Array<{ provider: string; model: string; ok: boolean; error?: string }>;
}

interface OpenAiCompatProvider {
  id: "nvidia" | "deepseek" | "groq" | "openrouter" | "ollama";
  baseUrl: string;
  apiKey: string;
  model: string;
}

function getGeminiModels(tier: AiTaskTier): string[] {
  if (tier === "deep_reasoning") {
    return [
      process.env.GEMINI_REASONING_MODEL || "gemini-3.8-flash",
      process.env.GEMINI_FAST_MODEL || "gemini-4-hydrogen",
    ];
  }
  if (tier === "vision_forensic") {
    return [
      process.env.GEMINI_VISION_MODEL || "gemini-4-hydrogen",
      process.env.GEMINI_LITE_MODEL || "gemini-3.5-flash-lite",
    ];
  }
  return [
    process.env.GEMINI_FAST_MODEL || "gemini-4-hydrogen",
    process.env.GEMINI_LITE_MODEL || "gemini-3.5-flash-lite",
  ];
}

function getOpenAiCompatChain(tier: AiTaskTier): OpenAiCompatProvider[] {
  const chain: OpenAiCompatProvider[] = [];

  // Provider #2: NVIDIA NIM (Free dev tier via build.nvidia.com -> nvapi- key)
  if (process.env.NVIDIA_API_KEY) {
    const baseUrl = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
    const apiKey = process.env.NVIDIA_API_KEY;

    if (tier === "deep_reasoning") {
      chain.push({
        id: "nvidia",
        baseUrl,
        apiKey,
        model: process.env.NVIDIA_REASONING_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
      });
      if (process.env.NVIDIA_KIMI_MODEL) {
        chain.push({
          id: "nvidia",
          baseUrl,
          apiKey,
          model: process.env.NVIDIA_KIMI_MODEL,
        });
      }
    } else if (tier === "vision_forensic") {
      chain.push({
        id: "nvidia",
        baseUrl,
        apiKey,
        model: process.env.NVIDIA_VISION_MODEL || "nvidia/nemotron-3.5-super-vl-120b-a12b",
      });
    } else {
      chain.push(
        {
          id: "nvidia",
          baseUrl,
          apiKey,
          model: process.env.NVIDIA_TOOL_MODEL || "deepseek-ai/deepseek-v4.1-flash",
        },
        {
          id: "nvidia",
          baseUrl,
          apiKey,
          model: process.env.NVIDIA_FAST_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
        }
      );
    }
  }

  // Provider #3: OpenRouter Free Models (Strictly :free endpoints by default)
  if (process.env.OPENROUTER_API_KEY) {
    const model =
      tier === "deep_reasoning"
        ? process.env.OPENROUTER_REASONING_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free"
        : tier === "vision_forensic"
        ? process.env.OPENROUTER_VISION_MODEL || "nvidia/nemotron-3.5-super-vl:free"
        : process.env.OPENROUTER_FAST_MODEL || "nvidia/nemotron-3.5-lightning:free";

    chain.push({
      id: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      model,
    });
  }

  // Optional Direct Providers (DeepSeek / Groq / Local Ollama)
  if (process.env.DEEPSEEK_API_KEY) {
    chain.push({
      id: "deepseek",
      baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, ""),
      apiKey: process.env.DEEPSEEK_API_KEY,
      model:
        tier === "deep_reasoning"
          ? process.env.DEEPSEEK_REASONING_MODEL || "deepseek-reasoner"
          : process.env.DEEPSEEK_FAST_MODEL || "deepseek-chat",
    });
  }

  if (process.env.GROQ_API_KEY) {
    chain.push({
      id: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    });
  }

  if (process.env.OLLAMA_BASE_URL) {
    chain.push({
      id: "ollama",
      baseUrl: `${process.env.OLLAMA_BASE_URL.replace(/\/$/, "")}/v1`,
      apiKey: "ollama",
      model: process.env.OLLAMA_MODEL || "qwen2.5-coder:7b",
    });
  }

  return chain;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`AI_TIMEOUT_${ms}MS`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getAiRouterDiagnostics() {
  const configuredProviders: string[] = [];
  if (process.env.GEMINI_API_KEY) configuredProviders.push("gemini");
  if (process.env.NVIDIA_API_KEY) configuredProviders.push("nvidia_nim");
  if (process.env.OPENROUTER_API_KEY) configuredProviders.push("openrouter_free");
  if (process.env.DEEPSEEK_API_KEY) configuredProviders.push("deepseek");
  if (process.env.GROQ_API_KEY) configuredProviders.push("groq");
  if (process.env.OLLAMA_BASE_URL) configuredProviders.push("ollama");

  return {
    routerVersion: "2026-11-multi-tier",
    configuredProviders,
    deterministicFallbackAlwaysReady: true,
    tiers: {
      fast_sensory: {
        gemini: getGeminiModels("fast_sensory"),
        failoverModels: getOpenAiCompatChain("fast_sensory").map((p) => `${p.id}:${p.model}`),
      },
      deep_reasoning: {
        gemini: getGeminiModels("deep_reasoning"),
        failoverModels: getOpenAiCompatChain("deep_reasoning").map((p) => `${p.id}:${p.model}`),
      },
      vision_forensic: {
        gemini: getGeminiModels("vision_forensic"),
        failoverModels: getOpenAiCompatChain("vision_forensic").map((p) => `${p.id}:${p.model}`),
      },
    },
  };
}

export async function runRoutedCompletion(req: AiCompletionRequest): Promise<AiCompletionResult> {
  const started = Date.now();
  const timeoutMs = req.timeoutMs ?? 12000;
  const attempts: AiCompletionResult["attempts"] = [];

  // 1. Primary: Google GenAI (Gemini 4 Hydrogen / 3.8 Flash / 3.5 Flash-Lite)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    for (const model of getGeminiModels(req.tier)) {
      try {
        const res = await withTimeout(
          ai.models.generateContent({
            model,
            contents: `${req.systemPrompt}\n\n${req.userPrompt}`,
            config: {
              temperature: req.temperature ?? 0.2,
              maxOutputTokens: req.maxTokens ?? 1024,
            },
          }),
          timeoutMs
        );
        const text = (res.text || "").trim();
        if (text) {
          attempts.push({ provider: "gemini", model, ok: true });
          return {
            text,
            provider: "gemini",
            model,
            tier: req.tier,
            latencyMs: Date.now() - started,
            attempts,
          };
        }
        attempts.push({ provider: "gemini", model, ok: false, error: "empty_response" });
      } catch (err) {
        attempts.push({
          provider: "gemini",
          model,
          ok: false,
          error: err instanceof Error ? err.message.slice(0, 120) : "gemini_error",
        });
      }
    }
  }

  // 2. Failover Chain: NVIDIA NIM -> OpenRouter :free -> DeepSeek / Groq / Ollama
  for (const p of getOpenAiCompatChain(req.tier)) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.apiKey}`,
      };
      if (p.id === "openrouter") {
        headers["HTTP-Referer"] = "https://quadillar-live-view.vercel.app";
        headers["X-Title"] = "Quadillar LiveView Construction OS";
      }

      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: p.model,
          temperature: req.temperature ?? 0.2,
          max_tokens: req.maxTokens ?? 1024,
          messages: [
            { role: "system", content: req.systemPrompt },
            { role: "user", content: req.userPrompt },
          ],
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        attempts.push({ provider: p.id, model: p.model, ok: false, error: `HTTP_${res.status}` });
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = (data.choices?.[0]?.message?.content || "").trim();
      if (text) {
        attempts.push({ provider: p.id, model: p.model, ok: true });
        return {
          text,
          provider: p.id,
          model: p.model,
          tier: req.tier,
          latencyMs: Date.now() - started,
          attempts,
        };
      }
      attempts.push({ provider: p.id, model: p.model, ok: false, error: "empty_response" });
    } catch (err) {
      attempts.push({
        provider: p.id,
        model: p.model,
        ok: false,
        error: err instanceof Error ? err.message.slice(0, 120) : "provider_error",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // 3. Tier-0 Deterministic Engineering Fallback
  const fallbackText = req.deterministicFallback
    ? req.deterministicFallback()
    : "Deterministic Molecular Governor Core active.";

  return {
    text: fallbackText,
    provider: "deterministic_fallback",
    model: "molecular-governor-v1",
    tier: req.tier,
    latencyMs: Date.now() - started,
    attempts,
  };
}
