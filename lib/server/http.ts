import { NextResponse } from "next/server";

export function jsonOk<T extends Record<string, unknown>>(
  payload: T,
  status = 200,
  headers?: HeadersInit
) {
  return NextResponse.json(payload, { status, headers });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { ok: false, error: message, details } : { ok: false, error: message },
    { status }
  );
}

export async function readJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
