import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const DEMO_DEFAULT_DIRECTOR_PIN = "4220";

export interface RateLimitPolicy {
  bucket: string;
  limit: number;
  windowSec: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  bucket: string;
  clientIp: string;
  limit: number;
  remaining: number;
  resetAtEpochSec: number;
  retryAfterSec: number;
  backend: "upstash_redis" | "edge_memory";
}

export function extractClientIp(req: Request | NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp.slice(0, 64);
  return "127.0.0.1";
}

export function getDirectorPinStatus(): {
  pinMode: "production_env" | "demo_default";
  customPinConfigured: boolean;
  demoHint: string | null;
} {
  const configured = Boolean(process.env.DIRECTOR_ACTION_PIN?.trim());
  return {
    pinMode: configured ? "production_env" : "demo_default",
    customPinConfigured: configured,
    demoHint: configured ? null : DEMO_DEFAULT_DIRECTOR_PIN,
  };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Compare against dummy buffer to avoid timing leak on length mismatch
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyDirectorPin(
  suppliedPin: string | null | undefined,
  overrideExpectedPin?: string
): { authorized: boolean; pinMode: "production_env" | "demo_default"; reason?: string } {
  const envPin = overrideExpectedPin ?? process.env.DIRECTOR_ACTION_PIN?.trim();
  const pinMode: "production_env" | "demo_default" = envPin ? "production_env" : "demo_default";
  const expected = envPin || DEMO_DEFAULT_DIRECTOR_PIN;
  const candidate = (suppliedPin || "").trim();

  if (!candidate) {
    return {
      authorized: false,
      pinMode,
      reason: "Director authorization PIN required in x-director-pin header or directorPin body field.",
    };
  }

  if (!timingSafeStringEqual(candidate, expected)) {
    return {
      authorized: false,
      pinMode,
      reason: "Invalid Director authorization PIN.",
    };
  }

  return { authorized: true, pinMode };
}

// In-memory sliding-window store on globalThis with automatic pruning
const g = globalThis as typeof globalThis & {
  __quadillarRateBuckets?: Map<string, number[]>;
};
const memBuckets = (g.__quadillarRateBuckets ??= new Map<string, number[]>());

function checkMemoryRateLimit(key: string, policy: RateLimitPolicy, clientIp: string, nowMs = Date.now()): RateLimitDecision {
  const windowMs = policy.windowSec * 1000;
  const cutoff = nowMs - windowMs;

  // Periodic lightweight cleanup to prevent unbounded growth
  if (memBuckets.size > 2000) {
    for (const [k, list] of memBuckets.entries()) {
      if (list.length === 0 || list[list.length - 1] < cutoff) memBuckets.delete(k);
    }
  }

  const existing = (memBuckets.get(key) || []).filter((ts) => ts > cutoff);
  const resetAtEpochSec = Math.ceil(((existing[0] ?? nowMs) + windowMs) / 1000);

  if (existing.length >= policy.limit) {
    memBuckets.set(key, existing);
    const retryAfterSec = Math.max(1, Math.ceil((existing[0] + windowMs - nowMs) / 1000));
    return {
      allowed: false,
      bucket: policy.bucket,
      clientIp,
      limit: policy.limit,
      remaining: 0,
      resetAtEpochSec,
      retryAfterSec,
      backend: "edge_memory",
    };
  }

  existing.push(nowMs);
  memBuckets.set(key, existing);
  return {
    allowed: true,
    bucket: policy.bucket,
    clientIp,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - existing.length),
    resetAtEpochSec,
    retryAfterSec: 0,
    backend: "edge_memory",
  };
}

/**
 * Checks per-IP rate limit using Upstash Redis REST when configured,
 * falling back seamlessly to an in-memory sliding window.
 */
export async function checkRateLimit(
  clientIp: string,
  policy: RateLimitPolicy,
  nowMs = Date.now()
): Promise<RateLimitDecision> {
  const key = `rl:${policy.bucket}:${clientIp}`;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    const windowBucket = Math.floor(nowMs / (policy.windowSec * 1000));
    const redisKey = `${key}:${windowBucket}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    try {
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, policy.windowSec + 5],
        ]),
        signal: ctrl.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as Array<{ result?: number }>;
        const count = Number(data?.[0]?.result ?? 1);
        const resetAtEpochSec = (windowBucket + 1) * policy.windowSec;
        const retryAfterSec = Math.max(1, resetAtEpochSec - Math.floor(nowMs / 1000));
        return {
          allowed: count <= policy.limit,
          bucket: policy.bucket,
          clientIp,
          limit: policy.limit,
          remaining: Math.max(0, policy.limit - count),
          resetAtEpochSec,
          retryAfterSec: count <= policy.limit ? 0 : retryAfterSec,
          backend: "upstash_redis",
        };
      }
    } catch {
      // Fall through cleanly to edge memory
    } finally {
      clearTimeout(timer);
    }
  }

  return checkMemoryRateLimit(key, policy, clientIp, nowMs);
}

export function buildRateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(decision.resetAtEpochSec),
    "X-RateLimit-Backend": decision.backend,
  };
  if (!decision.allowed) {
    headers["Retry-After"] = String(decision.retryAfterSec);
  }
  return headers;
}

export function rateLimitExceededResponse(decision: RateLimitDecision): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: `Rate limit exceeded for ${decision.bucket}. Retry in ${decision.retryAfterSec}s.`,
      retryAfterSec: decision.retryAfterSec,
      limit: decision.limit,
    },
    {
      status: 429,
      headers: buildRateLimitHeaders(decision),
    }
  );
}

export function resetMemoryRateLimitsForTests() {
  memBuckets.clear();
}

// ---------------------------------------------------------------------------
// Sprint 14B: 3-Tier Role-Based Access Control (DIRECTOR / SITE_ENGINEER / AUDITOR)
// ---------------------------------------------------------------------------
export type OperatorRole = "DIRECTOR" | "SITE_ENGINEER" | "AUDITOR";

export type KineticActionType =
  | "FREEZE_RA_BILL_422"
  | "REVOKE_CRANE_PTW"
  | "REVOKE_STRIPPING_PTW"
  | "ISSUE_CLAUSE42_RECOVERY"
  | "CLEAR_FOR_RTGS";

export const VALID_OPERATOR_ROLES: readonly OperatorRole[] = [
  "DIRECTOR",
  "SITE_ENGINEER",
  "AUDITOR",
] as const;

export const DEMO_ROLE_PINS: Record<OperatorRole, string> = {
  DIRECTOR: DEMO_DEFAULT_DIRECTOR_PIN,
  SITE_ENGINEER: "3110",
  AUDITOR: "1000",
};

export const RBAC_ACTION_MATRIX: Record<OperatorRole, KineticActionType[]> = {
  DIRECTOR: [
    "FREEZE_RA_BILL_422",
    "REVOKE_CRANE_PTW",
    "REVOKE_STRIPPING_PTW",
    "ISSUE_CLAUSE42_RECOVERY",
    "CLEAR_FOR_RTGS",
  ],
  SITE_ENGINEER: ["REVOKE_CRANE_PTW", "REVOKE_STRIPPING_PTW"],
  AUDITOR: [],
};

export function normalizeOperatorRole(raw?: string | null): OperatorRole | null {
  const cleaned = (raw || "").trim().toUpperCase();
  if (!cleaned) return "DIRECTOR"; // Backward-compatible default when role header omitted
  if (cleaned === "DIRECTOR" || cleaned === "SITE_ENGINEER" || cleaned === "AUDITOR") {
    return cleaned;
  }
  return null;
}

function getEnvPinForRole(
  role: OperatorRole,
  overrideEnvPins?: Partial<Record<OperatorRole, string>>
): string | undefined {
  if (overrideEnvPins && role in overrideEnvPins) {
    return overrideEnvPins[role]?.trim() || undefined;
  }
  switch (role) {
    case "DIRECTOR":
      return process.env.DIRECTOR_ACTION_PIN?.trim() || undefined;
    case "SITE_ENGINEER":
      return process.env.SITE_ENGINEER_PIN?.trim() || undefined;
    case "AUDITOR":
      return process.env.AUDITOR_ACCESS_PIN?.trim() || undefined;
  }
}

export function getRbacStatus() {
  const roles = {} as Record<
    OperatorRole,
    {
      pinMode: "production_env" | "demo_default";
      customPinConfigured: boolean;
      demoHint: string | null;
      allowedActions: KineticActionType[];
    }
  >;

  for (const role of VALID_OPERATOR_ROLES) {
    const envPin = getEnvPinForRole(role);
    const configured = Boolean(envPin);
    roles[role] = {
      pinMode: configured ? "production_env" : "demo_default",
      customPinConfigured: configured,
      demoHint: configured ? null : DEMO_ROLE_PINS[role],
      allowedActions: RBAC_ACTION_MATRIX[role],
    };
  }

  return {
    enforced: true,
    defaultRoleWhenOmitted: "DIRECTOR" as OperatorRole,
    roles,
  };
}

export function authorizeOperatorAction(params: {
  role?: string | null;
  suppliedPin?: string | null;
  actionType?: KineticActionType | null;
  overrideEnvPins?: Partial<Record<OperatorRole, string>>;
}): {
  authorized: boolean;
  httpStatus: 200 | 400 | 401 | 403;
  role: OperatorRole | null;
  pinMode: "production_env" | "demo_default";
  allowedActionsForRole: KineticActionType[];
  reason?: string;
} {
  const role = normalizeOperatorRole(params.role);
  if (!role) {
    return {
      authorized: false,
      httpStatus: 400,
      role: null,
      pinMode: "demo_default",
      allowedActionsForRole: [],
      reason: `Unknown operator role '${params.role}'. Allowed: DIRECTOR, SITE_ENGINEER, AUDITOR.`,
    };
  }

  const envPin = getEnvPinForRole(role, params.overrideEnvPins);
  const pinMode: "production_env" | "demo_default" = envPin ? "production_env" : "demo_default";
  const expectedPin = envPin || DEMO_ROLE_PINS[role];
  const candidate = (params.suppliedPin || "").trim();
  const allowedActionsForRole = RBAC_ACTION_MATRIX[role];

  // Step 1: Authentication (401)
  if (!candidate) {
    return {
      authorized: false,
      httpStatus: 401,
      role,
      pinMode,
      allowedActionsForRole,
      reason: `${role} authorization PIN required in x-operator-pin / x-director-pin header or pin body field.`,
    };
  }

  if (!timingSafeStringEqual(candidate, expectedPin)) {
    return {
      authorized: false,
      httpStatus: 401,
      role,
      pinMode,
      allowedActionsForRole,
      reason: `Invalid ${role} authorization PIN.`,
    };
  }

  // Step 2: Role-Based Authorization (403)
  if (params.actionType && !allowedActionsForRole.includes(params.actionType)) {
    return {
      authorized: false,
      httpStatus: 403,
      role,
      pinMode,
      allowedActionsForRole,
      reason:
        role === "AUDITOR"
          ? `RBAC FORBIDDEN: Role AUDITOR is strictly read-only and cannot execute ${params.actionType}.`
          : `RBAC FORBIDDEN: Role ${role} cannot execute ${params.actionType}. Permitted actions: ${allowedActionsForRole.join(", ")}.`,
    };
  }

  return {
    authorized: true,
    httpStatus: 200,
    role,
    pinMode,
    allowedActionsForRole,
  };
}
