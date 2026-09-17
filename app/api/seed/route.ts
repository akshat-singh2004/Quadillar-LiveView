import { NextResponse } from "next/server";
import { populateLiveViewDemo } from "@/lib/seeds/populateLiveViewDemo";

export async function GET() {
  try {
    const result = await populateLiveViewDemo();
    return NextResponse.json({ ok: true, seeded: result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await populateLiveViewDemo();
    return NextResponse.json({ ok: true, seeded: result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
