import { NextRequest, NextResponse } from "next/server";
import type { MemoryEngram } from "@/lib/memory/quadmaxMemoryCortex";

export const runtime = "nodejs";

const SERVER_MEMORY_RING: MemoryEngram[] = [];
const MAX_SERVER_ENGRAMS = 120;

export function getServerMemorySnapshot(): MemoryEngram[] {
  return [...SERVER_MEMORY_RING];
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    count: SERVER_MEMORY_RING.length,
    engrams: SERVER_MEMORY_RING.slice(0, 30),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const engram = body?.engram as MemoryEngram | undefined;
    if (!engram || !engram.title) {
      return NextResponse.json({ error: "Valid engram payload required" }, { status: 400 });
    }

    const idx = SERVER_MEMORY_RING.findIndex((e) => e.id === engram.id);
    if (idx !== -1) SERVER_MEMORY_RING.splice(idx, 1);
    SERVER_MEMORY_RING.unshift(engram);
    if (SERVER_MEMORY_RING.length > MAX_SERVER_ENGRAMS) {
      SERVER_MEMORY_RING.length = MAX_SERVER_ENGRAMS;
    }

    return NextResponse.json({ ok: true, count: SERVER_MEMORY_RING.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Memory sync failed" }, { status: 500 });
  }
}
