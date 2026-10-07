"use server";

import { createClient } from "@supabase/supabase-js";
import { recordTurnstilePunch } from "@/app/actions/labor-actions";
import { HermesAgent } from "@/lib/agents/hermes";

export interface ScanResult {
  success: boolean;
  accessGranted: boolean;
  message: string;
  worker?: {
    pin: string;
    name: string;
    trade: string;
    tier: string;
    agency: string;
    bloodGroup: string;
    emergencyContact: string;
    permittedZones: string[];
  } | null;
  rejectionReason?: string;
  punchTime?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function verifyAndPunchGatePass(
  projectId: string,
  qrHashOrPin: string,
  direction: "INGRESS" | "EGRESS" = "INGRESS"
): Promise<ScanResult> {
  try {
    const supabase = getSupabase();
    const cleanQuery = qrHashOrPin.trim();

    // 1. Query gate pass by either QR hash, Pass Number, or Worker PIN
    const { data: pass, error } = await supabase
      .from("worker_site_gate_passes")
      .select("*")
      .eq("project_id", projectId)
      .or(`qr_payload_hash.eq.${cleanQuery},pass_number.eq.${cleanQuery},worker_pin.eq.${cleanQuery}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !pass) {
      return {
        success: false,
        accessGranted: false,
        message: "ACCESS DENIED: Unregistered or invalid credential signature.",
        rejectionReason: "Credential not found in authorized pass registry",
      };
    }

    // 2. Argus HSE Validation: Check medical fitness expiration
    const expiryDate = new Date(pass.medical_fitness_expiry).getTime();
    const now = Date.now();
    if (expiryDate < now) {
      return {
        success: false,
        accessGranted: false,
        message: `ACCESS DENIED: Medical fitness expired on ${pass.medical_fitness_expiry}.`,
        rejectionReason: "HSE Medical Clearance Expired (Argus Interlock)",
        worker: {
          pin: pass.worker_pin,
          name: pass.worker_name,
          trade: pass.trade_classification,
          tier: pass.skill_tier,
          agency: pass.contractor_agency,
          bloodGroup: pass.blood_group,
          emergencyContact: pass.emergency_contact,
          permittedZones: pass.permitted_zones || [],
        },
      };
    }

    // Check pass status
    if (pass.status !== "PASS_ACTIVE") {
      return {
        success: false,
        accessGranted: false,
        message: `ACCESS DENIED: Pass status is ${pass.status}.`,
        rejectionReason: "Gate pass suspended or revoked",
      };
    }

    // 3. Autonomous Ingress Punch via Plutus
    await recordTurnstilePunch(projectId, pass.worker_pin, direction);

    // 4. Hermes Section 65B Notarization
    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Gate Scan Verified: ${pass.worker_name} (${direction})`,
      actionCategory: "LABOR_TURNSTILE_INGRESS_VERIFIED",
      moduleRef: pass.worker_pin,
      details: { pin: pass.worker_pin, direction, passNumber: pass.pass_number } as unknown as Record<string, unknown>,
      signatoryName: "Automated Turnstile Gantry #1",
      signatoryRole: "Autonomous Physical Access Controller",
      severity: "verified",
    });

    return {
      success: true,
      accessGranted: true,
      message: `ACCESS GRANTED: ${pass.worker_name} (${pass.contractor_agency}) Punched ${direction}.`,
      punchTime: new Date().toLocaleTimeString("en-IN"),
      worker: {
        pin: pass.worker_pin,
        name: pass.worker_name,
        trade: pass.trade_classification,
        tier: pass.skill_tier,
        agency: pass.contractor_agency,
        bloodGroup: pass.blood_group,
        emergencyContact: pass.emergency_contact,
        permittedZones: pass.permitted_zones || [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      accessGranted: false,
      message: "SYSTEM ERROR: Failed to execute turnstile verification.",
      rejectionReason: err?.message || "Internal gate controller error",
    };
  }
}
