import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import {
  normalizeOperatorRole,
  type OperatorRole,
} from "@/lib/server/securityGuard";

export type AuthSource = "supabase_jwt" | "demo_pin_header";

export interface JwtUserClaims {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

export interface RoleEmailAllowlists {
  directorEmails?: string;
  siteEngineerEmails?: string;
}

export interface ResolvedOperatorIdentity {
  ok: true;
  authSource: AuthSource;
  strictAuthRequired: boolean;
  role: OperatorRole;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  roleSource: "jwt_app_metadata" | "email_allowlist" | "jwt_default_least_privilege" | "header_or_body";
}

export interface RejectedOperatorIdentity {
  ok: false;
  httpStatus: 400 | 401;
  code: "SUPABASE_AUTH_REQUIRED" | "INVALID_JWT_SESSION" | "INVALID_ROLE";
  error: string;
  strictAuthRequired: boolean;
}

export type OperatorIdentityResolution = ResolvedOperatorIdentity | RejectedOperatorIdentity;

export function isStrictSupabaseAuthRequired(overrideFlag?: string): boolean {
  const raw = (overrideFlag ?? process.env.REQUIRE_SUPABASE_AUTH ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function getAuthPolicySummary() {
  const strict = isStrictSupabaseAuthRequired();
  return {
    strictAuthRequired: strict,
    authMode: strict ? "strict_supabase_jwt" : "hybrid_demo_fallback",
    stepUp2faRequired: true,
    trustedRoleClaim: "app_metadata.role",
    fallbackAllowlistEnvs: ["DIRECTOR_EMAILS", "SITE_ENGINEER_EMAILS"],
  };
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader) {
    const match = authHeader.trim().match(/^Bearer\s+(.+)$/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  return null;
}

function parseEmailList(csv?: string): Set<string> {
  if (!csv) return new Set();
  return new Set(
    csv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Resolves a verified Supabase user's RBAC role strictly from server-controlled metadata
 * (app_metadata.role) or server-side email allowlists. Client-mutable user_metadata is
 * intentionally NEVER trusted for privilege escalation.
 */
export function resolveRoleFromJwtClaims(
  user: JwtUserClaims,
  allowlists?: RoleEmailAllowlists
): {
  role: OperatorRole;
  roleSource: "jwt_app_metadata" | "email_allowlist" | "jwt_default_least_privilege";
} {
  const rawAppRole =
    user.app_metadata && typeof user.app_metadata.role === "string"
      ? user.app_metadata.role
      : null;

  if (rawAppRole) {
    const normalized = normalizeOperatorRole(rawAppRole);
    if (normalized) {
      return { role: normalized, roleSource: "jwt_app_metadata" };
    }
  }

  const email = (user.email || "").trim().toLowerCase();
  const directors = parseEmailList(
    allowlists?.directorEmails ?? process.env.DIRECTOR_EMAILS
  );
  const engineers = parseEmailList(
    allowlists?.siteEngineerEmails ?? process.env.SITE_ENGINEER_EMAILS
  );

  if (email && directors.has(email)) {
    return { role: "DIRECTOR", roleSource: "email_allowlist" };
  }
  if (email && engineers.has(email)) {
    return { role: "SITE_ENGINEER", roleSource: "email_allowlist" };
  }

  // Least-privilege default for authenticated users without an explicit server role grant
  return { role: "AUDITOR", roleSource: "jwt_default_least_privilege" };
}

/**
 * Pure policy evaluator (used both at runtime and in deterministic CI tests).
 * - Forged/invalid Bearer token ALWAYS fails closed 401 (never falls back to header role).
 * - Valid JWT ALWAYS overrides any client-supplied role header/body (anti-escalation).
 * - Missing Bearer token fails closed 401 when REQUIRE_SUPABASE_AUTH=true, else allows hybrid PIN mode.
 */
export function evaluateSessionPolicy(params: {
  bearerToken: string | null;
  verifiedUser: JwtUserClaims | null;
  verificationFailed: boolean;
  fallbackRole?: string | null;
  strictAuthRequired?: boolean;
  allowlists?: RoleEmailAllowlists;
}): OperatorIdentityResolution {
  const strict = params.strictAuthRequired ?? isStrictSupabaseAuthRequired();

  if (params.bearerToken) {
    if (params.verificationFailed || !params.verifiedUser) {
      return {
        ok: false,
        httpStatus: 401,
        code: "INVALID_JWT_SESSION",
        error: "Invalid or expired Supabase Auth JWT session. Sign in again at /auth.",
        strictAuthRequired: strict,
      };
    }

    const { role, roleSource } = resolveRoleFromJwtClaims(params.verifiedUser, params.allowlists);
    const metaName =
      params.verifiedUser.user_metadata &&
      typeof params.verifiedUser.user_metadata.full_name === "string" &&
      params.verifiedUser.user_metadata.full_name.trim()
        ? params.verifiedUser.user_metadata.full_name.trim()
        : null;

    return {
      ok: true,
      authSource: "supabase_jwt",
      strictAuthRequired: strict,
      role,
      userId: params.verifiedUser.id,
      email: params.verifiedUser.email ?? null,
      displayName: metaName || params.verifiedUser.email || params.verifiedUser.id,
      roleSource,
    };
  }

  if (strict) {
    return {
      ok: false,
      httpStatus: 401,
      code: "SUPABASE_AUTH_REQUIRED",
      error: "Supabase Auth Bearer JWT required (REQUIRE_SUPABASE_AUTH=true). Sign in at /auth.",
      strictAuthRequired: true,
    };
  }

  const normalized = normalizeOperatorRole(params.fallbackRole);
  if (!normalized) {
    return {
      ok: false,
      httpStatus: 400,
      code: "INVALID_ROLE",
      error: `Unknown operator role '${params.fallbackRole}'. Allowed: DIRECTOR, SITE_ENGINEER, AUDITOR.`,
      strictAuthRequired: false,
    };
  }

  return {
    ok: true,
    authSource: "demo_pin_header",
    strictAuthRequired: false,
    role: normalized,
    userId: null,
    email: null,
    displayName: null,
    roleSource: "header_or_body",
  };
}

export async function resolveOperatorIdentity(
  req: Request,
  fallbackRole?: string | null
): Promise<OperatorIdentityResolution> {
  const bearerToken = extractBearerToken(req);
  let verifiedUser: JwtUserClaims | null = null;
  let verificationFailed = false;

  if (bearerToken) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      verificationFailed = true;
    } else {
      try {
        const { data, error } = await supabase.auth.getUser(bearerToken);
        if (error || !data?.user) {
          verificationFailed = true;
        } else {
          verifiedUser = {
            id: data.user.id,
            email: data.user.email ?? null,
            app_metadata: (data.user.app_metadata as Record<string, unknown>) ?? null,
            user_metadata: (data.user.user_metadata as Record<string, unknown>) ?? null,
          };
        }
      } catch {
        verificationFailed = true;
      }
    }
  }

  return evaluateSessionPolicy({
    bearerToken,
    verifiedUser,
    verificationFailed,
    fallbackRole,
  });
}

export function formatStampedActor(
  identity: ResolvedOperatorIdentity,
  suppliedActor?: string | null,
  defaultLabel = "Executive War Room"
): string {
  if (identity.authSource === "supabase_jwt") {
    const label = identity.email || identity.displayName || identity.userId || "Verified Operator";
    return `${label} [${identity.role} • JWT]`.slice(0, 120);
  }
  const base = (suppliedActor || `${identity.role} (${defaultLabel})`).trim().slice(0, 90);
  return `${base} [${identity.role}]`;
}
