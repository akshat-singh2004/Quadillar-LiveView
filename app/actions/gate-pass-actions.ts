"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";
import crypto from "crypto";

export interface WorkerGatePassRecord {
  id: string;
  project_id: string;
  worker_pin: string;
  full_name: string;
  trade_category: string;
  skill_level: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED" | string;
  subcontractor_name: string;
  bocw_registration_no: string;
  blood_group: string;
  medical_fitness_valid_until: string;
  emergency_contact: string;
  status: "ACTIVE" | "REVOKED" | "SUSPENDED" | string;
  photo_url?: string | null;
  qr_signature_payload: string;
  hermes_seal_hash?: string | null;
  created_at: string;
}

export interface IssueGatePassPayload {
  projectId?: string;
  workerPin: string;
  fullName?: string;
  workerName?: string;
  tradeCategory?: string;
  tradeClassification?: string;
  skillLevel?: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED" | string;
  skillTier?: string;
  subcontractorName?: string;
  contractorAgency?: string;
  bocwRegistrationNo?: string;
  bloodGroup?: string;
  medicalFitnessValidUntil?: string;
  medicalFitnessExpiryIso?: string;
  emergencyContact?: string;
  permittedZones?: string[];
  issuedBy?: string;
  [key: string]: any;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchWorkerGatePasses(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<WorkerGatePassRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("worker_gate_passes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as WorkerGatePassRecord[];
  } catch (err: any) {
    console.error("[fetchWorkerGatePasses notice]:", err.message);
    return [];
  }
}

export async function issueWorkerGatePass(payload: IssueGatePassPayload) {
  try {
    const supabase = getSupabase();
    const projectId = payload.projectId || "GOMTI-NAGAR-PH1-FITOUT";

    const resolvedFullName = payload.fullName || payload.workerName || "Operative Worker";
    const resolvedTrade = payload.tradeCategory || payload.tradeClassification || "BAR_BENDER";
    const resolvedSkill = payload.skillLevel || payload.skillTier || "SKILLED";
    const resolvedSubcontractor = payload.subcontractorName || payload.contractorAgency || "Falcon Steel Fixing Ltd.";
    const resolvedBocw = payload.bocwRegistrationNo || "UP-BOCW-2026-PENDING";
    const resolvedMedical =
      payload.medicalFitnessValidUntil ||
      payload.medicalFitnessExpiryIso ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const resolvedBlood = payload.bloodGroup || "O+";
    const resolvedEmergency = payload.emergencyContact || "+91 99999 99999";

    // 1. Generate cryptographic QR payload signature
    const rawSignatureString = `${projectId}|${payload.workerPin}|${resolvedBocw}|${resolvedMedical}`;
    const qrSignature = crypto.createHash("sha256").update(rawSignatureString).digest("hex").slice(0, 32);
    const qrPayload = `LIVEVIEW-ID:${payload.workerPin}:${qrSignature}`;

    // 2. Notarize credential issuance via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Gate Pass Issued: ${resolvedFullName} (${payload.workerPin})`,
      actionCategory: "LABOR_GATE_PASS_ISSUED",
      moduleRef: payload.workerPin,
      details: {
        workerPin: payload.workerPin,
        fullName: resolvedFullName,
        trade: resolvedTrade,
        subcontractor: resolvedSubcontractor,
        bocwReg: resolvedBocw,
        qrSignature,
        issuedBy: payload.issuedBy || "Plutus Governor",
        permittedZones: payload.permittedZones || ["ALL_ZONES"],
      } as unknown as Record<string, unknown>,
      signatoryName: "Agent Plutus",
      signatoryRole: "Autonomous Labor Welfare & Ingress Governor",
      severity: "verified",
    });

    // 3. Upsert record into database
    const { data, error } = await supabase
      .from("worker_gate_passes")
      .upsert(
        {
          project_id: projectId,
          worker_pin: payload.workerPin,
          full_name: resolvedFullName,
          trade_category: resolvedTrade,
          skill_level: resolvedSkill,
          subcontractor_name: resolvedSubcontractor,
          bocw_registration_no: resolvedBocw,
          blood_group: resolvedBlood,
          medical_fitness_valid_until: resolvedMedical,
          emergency_contact: resolvedEmergency,
          status: "ACTIVE",
          qr_signature_payload: qrPayload,
          hermes_seal_hash: seal.blockHash,
          created_at: new Date().toISOString(),
        },
        { onConflict: "worker_pin" }
      )
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/labor/passes");
    revalidatePath("/labor/scan");
    revalidatePath("/labor/muster");
    revalidatePath("/");

    return { success: true, data, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to issue worker gate pass." };
  }
}
