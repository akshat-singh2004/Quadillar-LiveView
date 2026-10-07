import { createClient } from "@supabase/supabase-js";
import { CubeStatisticalAcceptanceEngine, CubeSpecimen } from "./sub-agents/aegis/cube-statistics";
import { RebarCoverDurabilityAuditor, EnvironmentalExposure } from "./sub-agents/aegis/rebar-cover";
import { HermesAgent } from "./hermes";

export interface NCRIssuancePayload {
  projectId: string;
  ncrNumber?: string;
  title?: string;
  description: string;
  gridLocation?: string;
  locationGrid?: string;
  locationZone?: string;
  structuralGrid?: string;
  statutoryClause?: string;
  ifcGuid?: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION" | string;
  withholdingAmountInr?: number;
  financialLienInr?: number;
  clauseRef?: string;
  rootCauseCategory?: string;
  assignedContractor?: string;
  identifiedBy?: string;
  correctiveActionRequired?: string;
  [key: string]: unknown;
}

export interface SpatialLockoutCheckResult {
  isLocked: boolean;
  activeNcrCount: number;
  reasons: string[];
  ncrs: any[];
  ncrNumber?: string;
  lockReason?: string;
}

export interface NCRIssuanceResult {
  success: boolean;
  data?: any;
  ncrId: string;
  ncrNumber: string;
  spatialLocked: boolean;
  financialLienInr: number;
  cryptographicHash: string;
  auditBlockId: string;
  error?: string;
}

export interface NCRClosureResult {
  success: boolean;
  data?: any;
  auditBlockId?: string;
  error?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Aegis.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class AegisAgent {
  // --- SUB-AGENT DELEGATIONS ---
  static adjudicateCompressiveBatch(targetFckMpa: number, specimens: CubeSpecimen[]) {
    return CubeStatisticalAcceptanceEngine.evaluateBatch(targetFckMpa, specimens);
  }

  static verifyCoverBlock(exposure: EnvironmentalExposure, memberType: "SLAB" | "BEAM" | "COLUMN" | "FOOTING", installedMm: number) {
    return RebarCoverDurabilityAuditor.auditCoverBlockInstallation({ exposure, memberType, installedCoverMm: installedMm });
  }

  // --- SPATIAL QUALITY LOCKOUT GATE ---
  static async checkSpatialLockout(
    projectId: string,
    ifcGuid?: string,
    locationGrid?: string
  ): Promise<SpatialLockoutCheckResult> {
    const supabase = getSupabase();

    let query = supabase
      .from("quality_ncr_register")
      .select("*")
      .eq("project_id", projectId)
      .neq("status", "CLOSED");

    if (locationGrid) {
      query = query.or(`grid_location.ilike.%${locationGrid}%,location_zone.ilike.%${locationGrid}%`);
    }

    const { data: ncrs, error } = await query;
    if (error) {
      console.warn("[Aegis Spatial Check Notice]:", error.message);
      return { isLocked: false, activeNcrCount: 0, reasons: [], ncrs: [] };
    }

    const activeNcrs = ncrs || [];
    const isLocked = activeNcrs.length > 0;
    const reasons = activeNcrs.map(
      (n: any) => `IS 456 HOLD: Active ${n.severity} NCR [${n.ncr_number}] on grid [${n.grid_location || n.location_zone || "Zone"}]: ${n.issue_description || n.title || "Quality defect"}`
    );

    const primaryNcr = activeNcrs[0];

    return {
      isLocked,
      activeNcrCount: activeNcrs.length,
      reasons,
      ncrs: activeNcrs,
      ncrNumber: primaryNcr?.ncr_number || undefined,
      lockReason: reasons[0] || undefined,
    };
  }

  // --- STATUTORY NCR ISSUANCE ENGINE ---
  static async issueNCR(payload: NCRIssuancePayload): Promise<NCRIssuanceResult> {
    try {
      const supabase = getSupabase();
      const ncrNumber = payload.ncrNumber || `NCR-${Date.now().toString().slice(-6)}`;
      const grid = payload.structuralGrid || payload.gridLocation || payload.locationGrid || payload.locationZone || "Site Axis";
      const clause = payload.statutoryClause || payload.clauseRef || "IS 456:2000 Cl. 10.2";
      const lien = Number(payload.financialLienInr || payload.withholdingAmountInr || 50000);
      const isCritical = payload.severity === "CRITICAL" || payload.severity === "MAJOR";

      const { data, error } = await supabase
        .from("quality_ncr_register")
        .insert({
          project_id: payload.projectId,
          ncr_number: ncrNumber,
          title: payload.title || `Structural Non-Conformance: ${grid}`,
          severity: payload.severity,
          issue_description: payload.description,
          grid_location: grid,
          ifc_guid: payload.ifcGuid || null,
          clause_reference: clause,
          withholding_amount_inr: lien,
          status: "OPEN_UNDER_RECTIFICATION",
          issued_by: payload.identifiedBy || "Agent Aegis (Structural Quality Governor)",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const seal = await HermesAgent.notarizeTransaction({
        projectId: payload.projectId,
        actionTitle: `Aegis Statutory NCR Issued: ${ncrNumber} [${payload.severity}]`,
        actionCategory: "QUALITY_IS456_NCR_ISSUED",
        moduleRef: ncrNumber,
        details: { ...payload } as Record<string, unknown>,
        signatoryName: "Agent Aegis (Structural Quality Governor)",
        signatoryRole: "Autonomous Materials Adjudicator",
        severity: "critical",
      });

      return {
        success: true,
        data,
        ncrId: String(data.id),
        ncrNumber,
        spatialLocked: isCritical,
        financialLienInr: lien,
        cryptographicHash: seal.blockHash,
        auditBlockId: seal.id || seal.blockHash,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to issue NCR.",
        ncrId: "",
        ncrNumber: "",
        spatialLocked: false,
        financialLienInr: 0,
        cryptographicHash: "",
        auditBlockId: "",
      };
    }
  }

  // --- STATUTORY NCR CLOSEOUT ENGINE ---
  static async closeNCR(params: {
    ncrId: string;
    projectId?: string;
    closedBy?: string;
    rectificationNotes?: string;
    verificationEvidenceUrl?: string;
    [key: string]: unknown;
  }): Promise<NCRClosureResult> {
    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from("quality_ncr_register")
        .update({
          status: "CLOSED",
          withholding_amount_inr: 0,
          closed_at: new Date().toISOString(),
          closure_remarks: params.rectificationNotes || "Rectification verified by SEOR.",
        })
        .eq("id", params.ncrId)
        .select()
        .single();

      if (error) throw error;

      const pId = params.projectId || data?.project_id || "GOMTI-NAGAR-PH1-FITOUT";

      const seal = await HermesAgent.notarizeTransaction({
        projectId: pId,
        actionTitle: `Aegis NCR Closed & Quality Lien Released: ${data?.ncr_number || params.ncrId}`,
        actionCategory: "QUALITY_IS456_NCR_CLOSED",
        moduleRef: String(params.ncrId),
        details: { ...params } as Record<string, unknown>,
        signatoryName: params.closedBy || "Agent Aegis (Structural Quality Governor)",
        signatoryRole: "Autonomous Materials Adjudicator",
        severity: "verified",
      });

      return {
        success: true,
        data,
        auditBlockId: seal.id || seal.blockHash,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to close NCR." };
    }
  }

  static async notarizeStructuralQualityHold(params: {
    projectId: string;
    pourCardId: string;
    reason: string;
    details: Record<string, unknown>;
  }) {
    return HermesAgent.notarizeTransaction({
      projectId: params.projectId,
      actionTitle: `Aegis Structural Quality Hold: ${params.reason}`,
      actionCategory: "QUALITY_IS456_HOLD",
      moduleRef: params.pourCardId,
      details: params.details,
      signatoryName: "Agent Aegis (Structural Quality Governor)",
      signatoryRole: "Autonomous IS 456 Auditor",
      severity: "critical",
    });
  }
}
