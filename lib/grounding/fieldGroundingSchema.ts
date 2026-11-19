import { Type, Schema } from "@google/genai";
import { BIM_ZONE_REGISTRY } from "./bimZoneRegistry";

export type GroundingSeverity = "CRITICAL_HOLD" | "MODERATE_NCR" | "ROUTINE_DPR";
export type EscrowAction = "FREEZE_MILESTONE" | "NO_CHANGE";
export type GroundingWorkflowStatus = "COMMITTED" | "NEEDS_ENGINEER_PIN";

export interface GovernanceCouncilTrace {
  structural_qa_agent: {
    verdict: string;
    is_456_clause: string;
    hold_status: "HOLD_ENFORCED" | "ADVISORY_NCR" | "CLEARED";
  };
  commercial_escrow_agent: {
    verdict: string;
    withholding_lien_inr: number;
    milestone_lock: "LOCKED" | "UNLOCKED";
  };
  section_65b_vault_agent: {
    verdict: string;
    attestation_scope: string;
  };
}

export interface GeminiFieldExtraction {
  transcript_vernacular: string;
  engineering_summary: string;
  matched_bim_zone_id: string;
  structural_element: string;
  confidence_score: number;
  severity: GroundingSeverity;
  is_code_clause: string;
  escrow_action: EscrowAction;
  withholding_amount_inr: number;
  governance_council: GovernanceCouncilTrace;
}

export interface FieldGroundingRecord extends GeminiFieldExtraction {
  id: string;
  project_id: string;
  bit_id: string;
  zone_label: string;
  world_pos: [number, number, number];
  linked_ncr_id: string;
  status: GroundingWorkflowStatus;
  media_sha256: string;
  canonical_65b_sha256: string;
  captured_at: string;
  ingested_at: string;
  submitter_id: string;
  provenance_label: string;
  persisted_to_supabase: boolean;
}

export const FIELD_GROUNDING_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    transcript_vernacular: { type: Type.STRING },
    engineering_summary: { type: Type.STRING },
    matched_bim_zone_id: {
      type: Type.STRING,
      enum: BIM_ZONE_REGISTRY.map((z) => z.zoneId),
    },
    structural_element: { type: Type.STRING },
    confidence_score: { type: Type.NUMBER },
    severity: {
      type: Type.STRING,
      enum: ["CRITICAL_HOLD", "MODERATE_NCR", "ROUTINE_DPR"],
    },
    is_code_clause: { type: Type.STRING },
    escrow_action: {
      type: Type.STRING,
      enum: ["FREEZE_MILESTONE", "NO_CHANGE"],
    },
    withholding_amount_inr: { type: Type.NUMBER },
    governance_council: {
      type: Type.OBJECT,
      properties: {
        structural_qa_agent: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING },
            is_456_clause: { type: Type.STRING },
            hold_status: {
              type: Type.STRING,
              enum: ["HOLD_ENFORCED", "ADVISORY_NCR", "CLEARED"],
            },
          },
          required: ["verdict", "is_456_clause", "hold_status"],
        },
        commercial_escrow_agent: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING },
            withholding_lien_inr: { type: Type.NUMBER },
            milestone_lock: {
              type: Type.STRING,
              enum: ["LOCKED", "UNLOCKED"],
            },
          },
          required: ["verdict", "withholding_lien_inr", "milestone_lock"],
        },
        section_65b_vault_agent: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING },
            attestation_scope: { type: Type.STRING },
          },
          required: ["verdict", "attestation_scope"],
        },
      },
      required: ["structural_qa_agent", "commercial_escrow_agent", "section_65b_vault_agent"],
    },
  },
  required: [
    "transcript_vernacular",
    "engineering_summary",
    "matched_bim_zone_id",
    "structural_element",
    "confidence_score",
    "severity",
    "is_code_clause",
    "escrow_action",
    "withholding_amount_inr",
    "governance_council",
  ],
};
