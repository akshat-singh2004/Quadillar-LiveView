import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({ status: "ONLINE", gateway: "Biometric Turnstile Ingress" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, pin, direction, timestamp, projectId = "GOMTI-NAGAR-PH1-FITOUT" } = body;

    if (!deviceId || !pin || !direction) {
      return NextResponse.json(
        { error: "INVALID_HARDWARE_PACKET: Missing deviceId, pin, or direction" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Verify Biometric User in Registered Worker Muster
    const { data: worker, error: workerErr } = await supabase
      .from("labor_workforce_registry")
      .select("biometric_pin, full_name, trade_package, is_active")
      .eq("biometric_pin", String(pin).trim())
      .maybeSingle();

    if (workerErr || !worker) {
      return NextResponse.json(
        { error: `UNREGISTERED_WORKER: PIN ${pin} not found in BOCW registry` },
        { status: 403 }
      );
    }

    if (!worker.is_active) {
      return NextResponse.json(
        { error: `SUSPENDED_WORKER: Worker ${worker.full_name} is de-listed` },
        { status: 403 }
      );
    }

    // 2. Append Hardware Event
    const { error: insertErr } = await supabase
      .from("biometric_turnstile_events")
      .insert({
        project_id: projectId,
        device_id: deviceId,
        biometric_pin: String(pin).trim(),
        direction: direction.toUpperCase(),
        punch_time: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
        has_helmet_detected: true,
      });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      worker: worker.full_name,
      trade: worker.trade_package,
      direction: direction.toUpperCase(),
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Ingress Error" }, { status: 500 });
  }
}
