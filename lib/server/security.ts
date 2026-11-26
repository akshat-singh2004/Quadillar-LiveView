/**
 * Guards destructive or scheduled endpoints (/api/seed, /api/demo-reset, /api/cron/*).
 * - In local development (NODE_ENV !== "production"), allowed unless a secret is explicitly set.
 * - In production, FAILS CLOSED unless Authorization: Bearer <SECRET> or x-admin-secret matches
 *   the configured secret (ADMIN_SEED_TOKEN / ADMIN_API_SECRET / CRON_SECRET).
 */
export function verifyServerSecret(
  req: Request,
  envVarName: "ADMIN_API_SECRET" | "CRON_SECRET" = "ADMIN_API_SECRET",
  opts?: { allowPublicDemoResetHeader?: boolean }
): { allowed: boolean; reason?: string } {
  // Optional opt-in strictly for public sandbox demos when explicitly enabled in Vercel env
  if (
    opts?.allowPublicDemoResetHeader &&
    process.env.ALLOW_PUBLIC_DEMO_RESET === "true" &&
    req.headers.get("x-quadillar-reset") === "confirm"
  ) {
    return { allowed: true };
  }

  const secret =
    envVarName === "CRON_SECRET"
      ? process.env.CRON_SECRET || process.env.ADMIN_API_SECRET || process.env.ADMIN_SEED_TOKEN
      : process.env.ADMIN_SEED_TOKEN || process.env.ADMIN_API_SECRET || process.env.CRON_SECRET;

  if (process.env.NODE_ENV !== "production" && !secret) {
    return { allowed: true };
  }

  if (!secret) {
    return {
      allowed: false,
      reason: `${envVarName} is not configured in production; endpoint is locked by default.`,
    };
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const headerSecret = req.headers.get("x-admin-secret")?.trim() || "";

  if (bearer === secret || headerSecret === secret) {
    return { allowed: true };
  }

  return { allowed: false, reason: "Unauthorized: invalid or missing server secret." };
}
