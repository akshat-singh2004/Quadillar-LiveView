import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { getNotificationPrefs, saveNotificationPrefs } from "@/lib/repositories/notificationRepo";
import type { NotificationPreferences } from "@/lib/notifications/preferences";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userKey = req.nextUrl.searchParams.get("userKey") || "default-operator";
  const result = await getNotificationPrefs(userKey);
  return jsonOk(result);
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody<Partial<NotificationPreferences>>(req);
  if (!body) return jsonError("Invalid JSON body", 400);

  const saved = await saveNotificationPrefs(body);
  return jsonOk({ ok: true, ...saved });
}
