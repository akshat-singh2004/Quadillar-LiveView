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
