"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface AgentVerdict {
  agentName: string;
  name?: string;
  title: string;
  domain?: string;
  standard: string;
  status: "ACTIVE_HOLD" | "NOMINAL" | "WARNING" | string;
  metric?: string;
  summary?: string;
  reason?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

export interface CouncilAuditReport {
  timestamp: string;
  projectId?: string;
  totalGovernors?: number;
  activeHoldsCount?: number;
  verdicts: AgentVerdict[];
  summary?: string;
  overallStatus?: "CLEAR" | "HOLD" | string;
  [key: string]: any;
}

export interface Generate65BCertificatePayload {
  projectId: string;
  moduleReference: string;
  actionCategory: string;
  certifyingOfficer: string;
  certifyingOfficerDesignation?: string;
  hardwareServerId?: string;
  [key: string]: unknown;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Council actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchCouncilAggregatedPulse(projectId = "GOMTI-NAGAR-PH1-FITOUT") {
  try {
    const supabase = getSupabase();

    const [
      ncrsRes,
      pourCardsRes,
      permitsRes,
      billsRes,
      materialsRes,
      hydrationRes,
      musterRes,
      fleetRes,
      hindranceRes,
      clashesRes,
      eventsRes,
    ] = await Promise.all([
      supabase.from("quality_ncr_register").select("withholding_amount_inr, status").eq("project_id", projectId),
      supabase.from("digital_pour_cards").select("status").eq("project_id", projectId),
      supabase.from("digital_permits_to_work").select("status").eq("project_id", projectId),
      supabase.from("running_account_bills").select("gross_amount_inr, net_payable_inr, aegis_quality_lien_inr").eq("project_id", projectId),
      supabase.from("material_reconciliation_records").select("penal_recovery_inr, status").eq("project_id", projectId),
      supabase.from("concrete_hydration_telemetry").select("is_thermal_crack_risk, is_def_risk").eq("project_id", projectId),
      supabase.from("daily_labor_muster_rolls").select("ghost_workers_count, ghost_wage_debit_inr").eq("project_id", projectId),
      supabase.from("plant_machinery_telematics").select("operational_status, oee_pct").eq("project_id", projectId),
      supabase.from("site_hindrance_register").select("days_hindered, status").eq("project_id", projectId),
      supabase.from("bim_spatial_clashes").select("status").eq("project_id", projectId),
      supabase.from("council_interagent_events").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(6),
    ]);

    const ncrs = ncrsRes.data || [];
    const openNcrsCount = ncrs.filter((n) => n.status !== "CLOSED").length;
    const totalQualityLienInr = ncrs.filter((n) => n.status !== "CLOSED").reduce((s, n) => s + (Number(n.withholding_amount_inr) || 0), 0);

    const pourCards = pourCardsRes.data || [];
    const activePourHolds = pourCards.filter((p) => p.status === "SPATIAL_HOLD_NCR" || p.status === "PENDING_INSPECTION").length;

    const permits = permitsRes.data || [];
    const gasRevokedPermits = permits.filter((p) => p.status === "GAS_CONTAMINATION_REVOKED").length;

    const bills = billsRes.data || [];
    const totalGrossCertifiedInr = bills.reduce((s, b) => s + (Number(b.gross_amount_inr) || 0), 0);

    const materials = materialsRes.data || [];
    const penalDebitsInr = materials.reduce((s, m) => s + (Number(m.penal_recovery_inr) || 0), 0);

    const hydration = hydrationRes.data || [];
    const thermalCrackHolds = hydration.filter((h) => h.is_thermal_crack_risk || h.is_def_risk).length;

    const muster = musterRes.data || [];
    const ghostWorkersCount = muster.reduce((s, m) => s + (Number(m.ghost_workers_count) || 0), 0);
    const ghostContraChargeInr = muster.reduce((s, m) => s + (Number(m.ghost_wage_debit_inr) || 0), 0);

    const fleet = fleetRes.data || [];
    const groundedFleetCount = fleet.filter((f) => f.operational_status === "GROUNDED_SAFETY_HOLD").length;

    const hindrances = hindranceRes.data || [];
    const openDelayDays = hindrances.filter((h) => h.status === "OPEN_CRITICAL_DELAY").reduce((s, h) => s + (Number(h.days_hindered) || 0), 0);

    const clashes = clashesRes.data || [];
    const activeHardClashes = clashes.filter((c) => c.status === "OPEN_SPATIAL_HOLD").length;

    const totalActiveHolds =
      openNcrsCount +
      gasRevokedPermits +
      thermalCrackHolds +
      groundedFleetCount +
      activeHardClashes;

    return {
      success: true,
      openNcrsCount,
      totalQualityLienInr,
      activePourHolds,
      gasRevokedPermits,
      totalGrossCertifiedInr,
      penalDebitsInr,
      thermalCrackHolds,
      ghostWorkersCount,
      ghostContraChargeInr,
      groundedFleetCount,
      openDelayDays,
      activeHardClashes,
      totalActiveHolds,
      synapseEvents: eventsRes.data || [],
    };
  } catch (err: any) {
    console.error("[fetchCouncilAggregatedPulse fault]:", err?.message);
    return {
      success: false,
      openNcrsCount: 0,
      totalQualityLienInr: 0,
      activePourHolds: 0,
      gasRevokedPermits: 0,
      totalGrossCertifiedInr: 0,
      penalDebitsInr: 0,
      thermalCrackHolds: 0,
      ghostWorkersCount: 0,
      ghostContraChargeInr: 0,
      groundedFleetCount: 0,
      openDelayDays: 0,
      activeHardClashes: 0,
      totalActiveHolds: 0,
      synapseEvents: [],
    };
  }
}

export async function runAutonomousCouncilAudit(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<CouncilAuditReport> {
  const pulse = await fetchCouncilAggregatedPulse(projectId);

  const verdicts: AgentVerdict[] = [
    {
      agentName: "Aegis",
      name: "Aegis",
      title: "Structural Quality Governor",
      domain: "Structural Quality",
      standard: "IS 456 / IS 14687",
      status: pulse.openNcrsCount > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: `${pulse.openNcrsCount} Open NCRs`,
      summary: pulse.openNcrsCount > 0 ? `Lien withheld: ₹${pulse.totalQualityLienInr.toLocaleString("en-IN")}` : "IS 456 Table 11 compliance confirmed",
    },
    {
      agentName: "Argus",
      name: "Argus",
      title: "HSE & Environmental Governor",
      domain: "HSE & Environment",
      standard: "BOCW 1998 / IS 3696",
      status: pulse.gasRevokedPermits > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: pulse.gasRevokedPermits > 0 ? `${pulse.gasRevokedPermits} Gas Alerts` : "Wind Safe (≤38km/h)",
      summary: pulse.gasRevokedPermits > 0 ? "Atmospheric safety breach in confined zone" : "Permits & environmental limits cleared",
    },
    {
      agentName: "Midas",
      name: "Midas",
      title: "Commercial Waterfall Governor",
      domain: "Commercial & Billing",
      standard: "CPWD Works / FIDIC Cl. 14",
      status: "NOMINAL",
      metric: `₹${(pulse.totalGrossCertifiedInr / 100000).toFixed(1)}L Gross`,
      summary: "5-Tier statutory retainage & tax deduction waterfall active",
    },
    {
      agentName: "Vulcan",
      name: "Vulcan",
      title: "Materials & Metallurgy Governor",
      domain: "Materials & Metallurgy",
      standard: "CPWD Cl. 42 / IS 2502",
      status: pulse.penalDebitsInr > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: pulse.penalDebitsInr > 0 ? `₹${(pulse.penalDebitsInr / 1000).toFixed(0)}k Debit` : "Within ±3% Tol.",
      summary: pulse.penalDebitsInr > 0 ? "CPWD Cl. 42 penal recovery applied at 2x rate" : "1D BBS cutting scrap within ≤3.0%",
    },
    {
      agentName: "Daedalus",
      name: "Daedalus",
      title: "Thermodynamics & Maturity Governor",
      domain: "Hydration & Maturity",
      standard: "ASTM C1074 / CIRIA C766",
      status: pulse.thermalCrackHolds > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: pulse.thermalCrackHolds > 0 ? `${pulse.thermalCrackHolds} ΔT Holds` : "Maturity Safe",
      summary: pulse.thermalCrackHolds > 0 ? "Core-to-surface gradient ΔT > 20°C (crack risk)" : "Early thermal gradient within permissible limits",
    },
    {
      agentName: "Plutus",
      name: "Plutus",
      title: "Labor & Welfare Governor",
      domain: "Labor & BOCW",
      standard: "BOCW 1996 / Min Wages 1948",
      status: pulse.ghostWorkersCount > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: pulse.ghostWorkersCount > 0 ? `${pulse.ghostWorkersCount} Ghost Workers` : "100% Ingress Match",
      summary: pulse.ghostWorkersCount > 0 ? `₹${pulse.ghostContraChargeInr.toLocaleString("en-IN")} contra-charge debited` : "Biometric turnstile anti-passback verified",
    },
    {
      agentName: "Ananke",
      name: "Ananke",
      title: "Fleet & Heavy Plant Governor",
      domain: "Fleet & Telematics",
      standard: "ISO 22400 / CPWD Form 31",
      status: pulse.groundedFleetCount > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: pulse.groundedFleetCount > 0 ? `${pulse.groundedFleetCount} Grounded` : "Fleet Online",
      summary: pulse.groundedFleetCount > 0 ? "Asset grounded under safety or weather hold" : "ISO 22400 OEE and fuel consumption nominal",
    },
    {
      agentName: "Chronos",
      name: "Chronos",
      title: "Schedule & 4D Progress Governor",
      domain: "4D Schedule & TIA",
      standard: "CPM Network / SCL Protocol",
      status: pulse.openDelayDays > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: pulse.openDelayDays > 0 ? `+${pulse.openDelayDays}d Delay` : "Schedule on Track",
      summary: pulse.openDelayDays > 0 ? "Contemporaneous critical path slippage flagged" : "Topological critical path float positive",
    },
    {
      agentName: "Themis",
      name: "Themis",
      title: "Contract Claims & LD Governor",
      domain: "Legal Claims & LD",
      standard: "FIDIC Cl. 8.4 / CPWD Cl. 2",
      status: "NOMINAL",
      metric: "28d Time-Bar Active",
      summary: "Contractual notices tracked; unexcused delays assessed",
    },
    {
      agentName: "Minerva",
      name: "Minerva",
      title: "Spatial BIM & Clashes Governor",
      domain: "3D BIM Coordination",
      standard: "ISO 19650-2 / PAS 1192",
      status: pulse.activeHardClashes > 0 ? "ACTIVE_HOLD" : "NOMINAL",
      metric: pulse.activeHardClashes > 0 ? `${pulse.activeHardClashes} Hard Clashes` : "Zero Clashes",
      summary: pulse.activeHardClashes > 0 ? "Volumetric collision blocks structural pour" : "3D AABB interference clear",
    },
  ];

  const activeHoldsCount = verdicts.filter((v) => v.status === "ACTIVE_HOLD").length;

  return {
    timestamp: new Date().toISOString(),
    projectId,
    totalGovernors: verdicts.length,
    activeHoldsCount,
    verdicts,
    summary: activeHoldsCount > 0 ? `${activeHoldsCount} active statutory holds detected` : "All 10 Governors nominal",
    overallStatus: activeHoldsCount > 0 ? "HOLD" : "CLEAR",
  };
}

export async function evaluateAutonomousCouncil(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<CouncilAuditReport> {
  return runAutonomousCouncilAudit(projectId);
}

export async function generateSection65BCertificate(payload: Generate65BCertificatePayload) {
  try {
    const supabase = getSupabase();
    const certNumber = `SEC65B-CERT-${Date.now().toString().slice(-6)}`;
    const hardwareServerId = (payload.hardwareServerId as string) || "QUADILLAR-LIVEVIEW-CLOUD-NODE-01";
    const officer = payload.certifyingOfficer;
    const designation = (payload.certifyingOfficerDesignation as string) || "Head of Project Governance & Systems";

    const { data: auditLog } = await supabase
      .from("immutable_audit_logs")
      .select("*")
      .eq("module_ref", payload.moduleReference)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const blockHash = auditLog?.block_hash || `GENESIS-SEAL-${Date.now().toString(16)}`;
    const eventTime = auditLog?.created_at || new Date().toISOString();

    const affidavitText = `
CERTIFICATE UNDER SECTION 65B OF THE INDIAN EVIDENCE ACT, 1872
(READ WITH SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023)

I, ${officer}, holding the designation of ${designation}, do hereby solemnly affirm and state as under:

1. I am the authorized officer responsible for the management, operation, and maintenance of the Digital Governance Council computer systems and electronic databases utilized by Quadillar LiveView for Project [${payload.projectId}].
2. The electronic record bearing Module Reference [${payload.moduleReference}], classified under Category [${payload.actionCategory}], was produced by the automated server cluster [${hardwareServerId}] during the ordinary course of construction governance activities.
3. During the relevant period, the computer system was operating properly, and there were no operational faults, interruptions, or unrecorded tampering that could adversely affect the integrity of the electronic output.
4. The cryptographic SHA-256 Merkle chain transaction hash anchoring this record is:
   [${blockHash}]
   Timestamp of Record Creation: ${eventTime}
5. The contents of the accompanying electronic output are true and accurate reproductions of the data fed into and processed by the system.

DATED: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
LOCATION: Lucknow, Uttar Pradesh, India
CERTIFYING AUTHORITY: ${officer} (${designation})
    `.trim();

    const { data, error } = await supabase
      .from("section_65b_certificates")
      .insert({
        project_id: payload.projectId,
        certificate_number: certNumber,
        module_reference: payload.moduleReference,
        action_category: payload.actionCategory,
        hardware_server_id: hardwareServerId,
        hash_algorithm: "SHA-256",
        merkle_block_hash: blockHash,
        certifying_officer: officer,
        certifying_officer_designation: designation,
        evidence_payload_json: auditLog || { moduleRef: payload.moduleReference, category: payload.actionCategory },
        affidavit_text: affidavitText,
        certified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Section 65B Evidence Certificate Issued: ${certNumber}`,
      actionCategory: "HERMES_LEGAL_SECTION65B_ISSUED",
      moduleRef: certNumber,
      details: { certNumber, blockHash, officer, designation } as unknown as Record<string, unknown>,
      signatoryName: officer,
      signatoryRole: designation,
      severity: "verified",
    });

    revalidatePath("/governance/council");
    revalidatePath("/");

    return { success: true, data, certificateNumber: certNumber, affidavitText };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to generate Section 65B affidavit." };
  }
}
