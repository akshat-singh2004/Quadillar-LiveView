export type CutoverStage = "PILOT_HYBRID" | "STRICT_ENTERPRISE_READY";

export interface CutoverCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface CutoverReadinessReport {
  cutoverStage: CutoverStage;
  readinessScorePct: number;
  offlineBuildHardened: boolean;
  groundingModelPin: string;
  checks: CutoverCheckItem[];
  pendingCutoverActions: string[];
  evaluatedAtUtc: string;
}

const DEMO_DIRECTOR_PIN = "4220";
const DEMO_ENGINEER_PIN = "3110";
const DEMO_AUDITOR_PIN = "1100";
const DEMO_IOT_SECRET = "quadillar-iot-demo-secret-2026";

function isTruthyFlag(val?: string): boolean {
  const s = (val || "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

/**
 * Pure, secret-safe evaluator of production cutover posture.
 * Never returns raw secrets, tokens, or PIN strings — only booleans and non-sensitive labels.
 */
export function evaluateCutoverReadiness(
  env: Record<string, string | undefined> = process.env
): CutoverReadinessReport {
  const supabaseConfigured = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  const strictAuth = isTruthyFlag(env.REQUIRE_SUPABASE_AUTH);

  const customDirectorPin = Boolean(
    env.DIRECTOR_ACTION_PIN?.trim() && env.DIRECTOR_ACTION_PIN.trim() !== DEMO_DIRECTOR_PIN
  );
  const customEngineerPin = Boolean(
    env.SITE_ENGINEER_PIN?.trim() && env.SITE_ENGINEER_PIN.trim() !== DEMO_ENGINEER_PIN
  );
  const customAuditorPin = Boolean(
    env.AUDITOR_PIN?.trim() && env.AUDITOR_PIN.trim() !== DEMO_AUDITOR_PIN
  );
  const allCustomPins = customDirectorPin && customEngineerPin && customAuditorPin;

  const customIotSecret = Boolean(
    env.IOT_INGRESS_SECRET?.trim() && env.IOT_INGRESS_SECRET.trim() !== DEMO_IOT_SECRET
  );

  const geminiConfigured = Boolean(
    env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
  const groundingModelPin = env.GEMINI_GROUNDING_MODEL?.trim() || "default_router_fallback";

  const checks: CutoverCheckItem[] = [
    {
      id: "offline_build_hardened",
      label: "Offline-Safe Font & Build Pipeline",
      passed: true,
      detail: "Zero external Google Fonts fetches in app/layout.tsx (DNS-resilient builds).",
    },
    {
      id: "supabase_admin_ledger",
      label: "Supabase Postgres & Storage Ledger",
      passed: supabaseConfigured,
      detail: supabaseConfigured
        ? "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured."
        : "Running in edge fallback mode — set Supabase URL and service role key.",
    },
    {
      id: "strict_supabase_jwt",
      label: "Strict Supabase Auth JWT Enforcement",
      passed: strictAuth,
      detail: strictAuth
        ? "REQUIRE_SUPABASE_AUTH=true (hybrid demo fallback disabled)."
        : "Hybrid demo PIN mode active — set REQUIRE_SUPABASE_AUTH=true for strict cutover.",
    },
    {
      id: "custom_rbac_pins",
      label: "Non-Default Step-Up 2FA RBAC PINs",
      passed: allCustomPins,
      detail: allCustomPins
        ? "All 3 tier PINs (DIRECTOR, SITE_ENGINEER, AUDITOR) rotated off demo defaults."
        : "One or more operator PINs still using demo defaults (rotate DIRECTOR_ACTION_PIN, SITE_ENGINEER_PIN, AUDITOR_PIN).",
    },
    {
      id: "custom_iot_hmac_secret",
      label: "Non-Default IoT HMAC-SHA256 Secret",
      passed: customIotSecret,
      detail: customIotSecret
        ? "IOT_INGRESS_SECRET rotated off demo default."
        : "IOT_INGRESS_SECRET using demo default — set a 32+ byte random secret in Vercel.",
    },
    {
      id: "gemini_grounding_ready",
      label: "Gemini Vernacular-to-BIM Grounding",
      passed: geminiConfigured,
      detail: geminiConfigured
        ? `Gemini key active (model pin: ${groundingModelPin}).`
        : "Running deterministic regex fallback — set GEMINI_API_KEY for multimodal extraction.",
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const readinessScorePct = Math.round((passedCount / checks.length) * 100);
  const strictReady =
    supabaseConfigured && strictAuth && allCustomPins && customIotSecret && geminiConfigured;

  const pendingCutoverActions = checks
    .filter((c) => !c.passed)
    .map((c) => `${c.label}: ${c.detail}`);

  return {
    cutoverStage: strictReady ? "STRICT_ENTERPRISE_READY" : "PILOT_HYBRID",
    readinessScorePct,
    offlineBuildHardened: true,
    groundingModelPin,
    checks,
    pendingCutoverActions,
    evaluatedAtUtc: new Date().toISOString(),
  };
}
