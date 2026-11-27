import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/server/http";
import { RBAC_ACTION_MATRIX } from "@/lib/server/securityGuard";
import {
  extractBearerToken,
  getAuthPolicySummary,
  resolveOperatorIdentity,
} from "@/lib/server/authSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const hasBearer = Boolean(extractBearerToken(req));
  const policy = getAuthPolicySummary();

  if (!hasBearer) {
    return jsonOk({
      ok: true,
      authenticated: false,
      ...policy,
      user: null,
    });
  }

  const identity = await resolveOperatorIdentity(req, null);
  if (!identity.ok) {
    return jsonOk(
      {
        ok: false,
        authenticated: false,
        ...policy,
        code: identity.code,
        error: identity.error,
      },
      identity.httpStatus
    );
  }

  return jsonOk({
    ok: true,
    authenticated: identity.authSource === "supabase_jwt",
    ...policy,
    user: {
      id: identity.userId,
      email: identity.email,
      displayName: identity.displayName,
      role: identity.role,
      roleSource: identity.roleSource,
      allowedActions: RBAC_ACTION_MATRIX[identity.role],
    },
  });
}
