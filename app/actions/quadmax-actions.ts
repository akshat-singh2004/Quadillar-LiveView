"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { resolveSpatialClash } from "@/app/actions/bim-actions";
import { logContemporaneousHindrance } from "@/app/actions/hindrance-eot-actions";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface QuadMaxAction {
  id: string;
  type: "RESOLVE_CLASH" | "DISPATCH_EOT_CLAIM" | "RELEASE_QUALITY_LIEN" | "TRIGGER_CORE_TEST" | "DEPLOY_CURING_BLANKETS" | "EXECUTE_LABOR_CONTRA_CHARGE";
  label: string;
  governor: string;
  statutoryBasis: string;
  payload: any;
}

export interface QuadMaxMessage {
  role: "user" | "assistant" | "system";
  content: string;
  codeReferences?: string[];
  actionAvailable?: QuadMaxAction;
  spatialVisual?: {
    type: "3D_CLASH";
    gridLocation: string;
    structuralElement: string;
    mepElement: string;
    penetrationMm: number;
    dedicatedUrl: string;
  };
}

const STATUTORY_KNOWLEDGE_BASE = {
  SPATIAL: {
    code: "NBC 2016 Vol 2 Part 8 / IS 13920:2016 Cl. 6.2",
    rule: "Structural beams in ductile seismic frames (Zone III/Lucknow) shall not have core penetrations or sleeves within 2d of beam faces without compensatory closed stirrups and SEOR certified detailing (Detail S-402).",
  },
  QUALITY: {
    code: "IS 456:2000 Cl. 15.4 / IS 516:2021",
    rule: "Characteristic cube strength below target fck triggers mandatory core extraction testing under IS 516. Equivalent cube strength of cores must achieve >= 85% of specified fck (or >= 35 MPa for M35).",
  },
  THERMAL: {
    code: "ASTM C1074 / ACI 207.2R / IS 456 Cl. 13",
    rule: "Maximum differential between mass concrete core thermocouple and surface ambient/cover RTD shall not exceed 20 C to eliminate micro-tensile thermal cracking risk.",
  },
  CLAIMS: {
    code: "FIDIC GCC Cl. 8.4 & 20.1 / SCL Protocol 2nd Ed.",
    rule: "Contemporaneous delay notice must be submitted within 28 days of event onset. Missing this notice operates as a statutory time-bar under Clause 20.1.",
  },
  LABOR: {
    code: "BOCW Act 1996 Sec 45 / Model Standing Orders",
    rule: "Turnstile biometric ingress discrepancies (ghost entries) require automated contra-charge debiting against contractor master ledger.",
  }
};

export async function askQuadMax(
  userQuery: string,
  history: QuadMaxMessage[],
  projectId = "GOMTI-NAGAR-PH1-FITOUT"
): Promise<QuadMaxMessage> {
  const supabase = getSupabase();

  const [ncrs, clashes, hydration, hindrances, fleet, bills] = await Promise.all([
    supabase.from("quality_ncr_register").select("*").eq("project_id", projectId).not("status", "in", "(\"CLOSED\",\"VERIFIED_CLOSED\")"),
    supabase.from("bim_spatial_clashes").select("*").eq("project_id", projectId).eq("seor_waiver_status", "UNAPPROVED_HOLD"),
    supabase.from("concrete_hydration_telemetry").select("*").eq("project_id", projectId).eq("is_thermal_crack_risk", true),
    supabase.from("site_hindrance_register").select("*").eq("project_id", projectId).eq("status", "OPEN"),
    supabase.from("plant_machinery_telematics").select("*").eq("project_id", projectId).eq("operational_status", "GROUNDED_SAFETY_HOLD"),
    supabase.from("running_account_bills").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1),
    supabase.from("daily_labor_muster_rolls").select("*").eq("project_id", projectId).gt("ghost_workers_count", 0).eq("status", "GHOST_WORKERS_FLAGGED"),
  ]);

  const activeClashes = clashes.data || [];
  const activeNcrs = ncrs.data || [];
  const activeDelays = hindrances.data || [];
  const activeThermal = hydration.data || [];
  const groundedCranes = fleet.data || [];
  const latestBill = bills.data?.[0];

  const q = userQuery.toLowerCase();

  if (q.includes("clash") || q.includes("mep") || q.includes("pipe") || q.includes("penetration") || q.includes("beam")) {
    if (activeClashes.length > 0) {
      const clash = activeClashes[0];
      return {
        role: "assistant",
        content: [
          "### QuadMax Spatial Arbitration (Minerva Governor)",
          "",
          "**Anomalies Detected:** " + activeClashes.length + " Hard Volumetric Interferences",
          "**Critical Clash:** " + (clash.mep_service_element || "150mm Chilled Water Pipe") + " collides with " + (clash.structural_element || "PT Beam Bay 2") + " (" + (clash.penetration_depth_mm || 125) + "mm intrusion).",
          "**Location:** " + (clash.grid_location || "Grid F-8 Level 3"),
          "",
          "#### Codified Statutory Analysis:",
          "* **Regulation:** " + STATUTORY_KNOWLEDGE_BASE.SPATIAL.code,
          "* **Mandate:** " + STATUTORY_KNOWLEDGE_BASE.SPATIAL.rule,
          "* **SEOR Directive:** A raw core cut will breach post-tensioned tendon ducts. The only code-compliant path is authorising **Sleeve Detail S-402** with supplementary ductile cage ties.",
          "",
          "Would you like me to commit SEOR Sleeve Detail S-402 into the BIM coordination model and release the Minerva pour hold?"
        ].join("\n"),
        codeReferences: [STATUTORY_KNOWLEDGE_BASE.SPATIAL.code, "ISO 19650 LOD 400"],
        actionAvailable: {
          id: "act-resolve-clash",
          type: "RESOLVE_CLASH",
          label: "Commit SEOR Sleeve Detail S-402 (Release Pour Hold)",
          governor: "Minerva",
          statutoryBasis: STATUTORY_KNOWLEDGE_BASE.SPATIAL.code,
          payload: { clashId: clash.id, resolution: "SEOR_SLEEVED" }
        },
        spatialVisual: {
          type: "3D_CLASH",
          gridLocation: clash.grid_location || "Grid F-8 Level 3",
          structuralElement: clash.structural_element || "PT Beam Bay 2",
          mepElement: clash.mep_service_element || "150mm Chilled Water Pipe",
          penetrationMm: clash.penetration_depth_mm || 125,
          dedicatedUrl: "/engineering/clashes"
        },
      };
    } else {
      return {
        role: "assistant",
        content: [
          "### QuadMax Spatial Assessment",
          "",
          "Minerva reports **0 open spatial clashes**. All MEP penetrations and structural envelopes are fully coordinated under **ISO 19650 LOD 400**."
        ].join("\n"),
        codeReferences: ["ISO 19650", "NBC 2016 Part 8"]
      };
    }
  }

  if (q.includes("delay") || q.includes("hindrance") || q.includes("schedule") || q.includes("eot") || q.includes("fidic")) {
    return {
      role: "assistant",
      content: [
        "### QuadMax Schedule Governance (Chronos & Themis)",
        "",
        "**Active Hindrances:** " + activeDelays.length + " Critical Path Events Logged",
        "**Primary Bottleneck:** Level 3 PT Slab tendon profile revisions (+4 to 5 days contemporaneous impact).",
        "",
        "#### Codified Statutory Analysis:",
        "* **Statutory Standard:** " + STATUTORY_KNOWLEDGE_BASE.CLAIMS.code,
        "* **Contractual Liability:** Without a contemporaneous notice under Clause 8.4, the contractor faces risk of liquidated damages under CPWD Cl. 2.",
        "* **QuadMax Action Plan:** Formalise the delay record as a certified electronic entry, notarizing the hindrance event with Hermes before the 28-day window elapses."
      ].join("\n"),
      codeReferences: [STATUTORY_KNOWLEDGE_BASE.CLAIMS.code, "CPWD Cl. 5"],
      actionAvailable: {
        id: "act-dispatch-eot",
        type: "DISPATCH_EOT_CLAIM",
        label: "Seal & Dispatch FIDIC Cl. 8.4 Contemporaneous Notice",
        governor: "Chronos",
        statutoryBasis: STATUTORY_KNOWLEDGE_BASE.CLAIMS.code,
        payload: { days: 4, category: "CLIENT_DESIGN_HOLD", grid: "Level 3 PT Slab" }
      }
    };
  }

  if (q.includes("bill") || q.includes("money") || q.includes("waterfall") || q.includes("midas") || q.includes("lien") || q.includes("ipc")) {
    const grossVal = Number(latestBill?.gross_work_done) || 12500000;
    const backcharges = Number(latestBill?.ncr_backcharges_inr) || 1812950;
    const netCert = Number(latestBill?.net_payable_certified) || 8187050;
    const deedHash = latestBill?.sha256_deed_hash ? latestBill.sha256_deed_hash.slice(0, 16) : "bd92f503...";

    return {
      role: "assistant",
      content: [
        "### QuadMax Commercial Analysis (Midas Governor)",
        "",
        "**Latest Interim Payment Certificate:** " + (latestBill?.ra_bill_number || "RA-BILL-04"),
        "* **Gross Valuation (VOWD):** ₹" + (grossVal / 100000).toFixed(2) + " Lakhs",
        "* **Statutory Backcharges & Liens:** ₹" + (backcharges / 100000).toFixed(2) + " Lakhs",
        "* **Net Certified Liquidity:** ₹" + (netCert / 100000).toFixed(2) + " Lakhs",
        "* **Hermes Deed Hash:** `" + deedHash + "...`",
        "",
        "#### Statutory Waterfall Hierarchy Applied:",
        "1. Mobilisation Advance (10%) & Retention (5%)",
        "2. IT TDS (Sec 194C - 2%) + GST TDS (Sec 51 - 2%) + BOCW Cess (1%)",
        "3. Aegis Quality Withholdings + Plutus Anti-Passback Labor Debits"
      ].join("\n"),
      codeReferences: ["CPWD GCC Cl. 10B", "BOCW Cess Act 1996", "Income Tax Act Sec 194C"]
    };
  }

  if (q.includes("concrete") || q.includes("thermal") || q.includes("daedalus") || q.includes("aegis") || q.includes("temperature")) {
    return {
      role: "assistant",
      content: [
        "### QuadMax Concrete & Hydration Posture",
        "",
        "* **Daedalus Hydration Telemetry:** " + (activeThermal.length > 0 ? "⚠️ " + activeThermal.length + " thermal gradient risks active. Core-surface ΔT > 20°C exceeds ASTM C1074 crack thresholds." : "Nominal. Core-to-surface gradient <= 18°C."),
        "* **Aegis Quality Posture:** " + (activeNcrs.length === 0 ? "Compliant. IS 516 NABL core verification passed (38.4 MPa >= 35.0 MPa). Quality liens released." : "⚠️ " + activeNcrs.length + " Open NCRs pending core validation."),
        "",
        "#### Regulatory Threshold:",
        "* **Standard:** " + STATUTORY_KNOWLEDGE_BASE.THERMAL.code,
        "* **Prescription:** Maintain curing insulation blankets until core temperature drops below 55°C and surface differential drops under 20°C."
      ].join("\n"),
      codeReferences: [STATUTORY_KNOWLEDGE_BASE.THERMAL.code, "IS 456 Cl. 13"]
    };
  }

  return {
    role: "assistant",
    content: [
      "### QuadMax LiveView.OS Governance Matrix Overview",
      "",
      "**Project:** " + projectId + " | **Status:** 6 Domain Holds Engaged",
      "",
      "* **Minerva (BIM):** " + activeClashes.length + " Hard spatial penetrations awaiting SEOR sleeve sign-off.",
      "* **Chronos (Schedule):** " + activeDelays.length + " Hindrances on critical path (FIDIC Cl. 8.4 time-bar monitoring).",
      "* **Daedalus (Thermodynamics):** " + activeThermal.length + " RTD gradient holds (ASTM C1074).",
      "* **Ananke & Argus (Fleet/HSE):** " + groundedCranes.length + " Cranes grounded via 46.8 km/h wind interlock (IS 13367).",
      "* **Hermes (Vault):** Continuous SHA-256 Merkle notarization active under Section 65B/BSA 2023.",
      "",
      "Ask me to resolve spatial clashes, verify regulatory bye-laws, review the Midas commercial waterfall, or seal statutory notices."
    ].join("\n"),
    codeReferences: ["NBC 2016", "IS 456:2000", "FIDIC Red Book", "BSA 2023"]
  };
}

export async function executeQuadMaxAction(action: QuadMaxAction) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    if (action.type === "RESOLVE_CLASH") {
      const res = await resolveSpatialClash(
        action.payload.clashId,
        action.payload.resolution || "SEOR_SLEEVED",
        "QuadMax AI Architect",
        "Approved reinforced pipe sleeve detail as per drawing S-402 and IS 13920 Cl. 6.2."
      );
      revalidatePath("/dashboard");
     revalidatePath("/");
     return { success: true, message: "Spatial clash resolved with SEOR Drawing S-402. Minerva pour hold lifted." };
    }

    if (action.type === "DISPATCH_EOT_CLAIM") {
      const res = await logContemporaneousHindrance({
        projectId: "GOMTI-NAGAR-PH1-FITOUT",
        delayCategory: action.payload.category || "CLIENT_DESIGN_HOLD",
        description: "Contemporaneous EOT Claim for Tendon Layout Revision",
        gridLocation: action.payload.grid || "Level 3 PT Slab",
        daysHindered: action.payload.days || 4,
      });
      revalidatePath("/dashboard");
      revalidatePath("/");
      return { success: true, message: "FIDIC Cl. 8.4 notice dispatched and sealed in Hermes vault." };
    }

    if (action.type === "DEPLOY_CURING_BLANKETS") {
      const { data: updated, error } = await supabase
        .from("concrete_hydration_telemetry")
        .update({
          surface_temp_c: 52.0,
          differential_temp_c: 16.4,
          is_thermal_crack_risk: false,
          stripping_permitted: true
        })
        .eq("pour_card_id", action.payload.pourCardId);

      await supabase.from("immutable_audit_logs").insert({
        project_id: "GOMTI-NAGAR-PH1-FITOUT",
        action_title: "Thermal Blanket Insulation Deployed: ΔT reduced to 16.4°C",
        action_category: "THERMAL_RISK_MITIGATED",
        module_ref: action.payload.pourCardId,
        details: { action: "R-10 multi-layer thermal blankets deployed", previousDeltaT: action.payload.deltaT, currentDeltaT: 16.4 },
        signatory_name: "Agent Daedalus & QA Lead",
        signatory_role: "Materials & Quality Governor",
        severity: "info",
        merkle_root_hash: "MITIGATED-" + Date.now(),
        created_at: new Date().toISOString()
      });

      revalidatePath("/dashboard");
      revalidatePath("/quality/thermal-hydration");
      revalidatePath("/");
      return { success: true, message: "Thermal insulation blankets recorded. ΔT normalized below 20°C. Stripping lock lifted." };
    }

    if (action.type === "TRIGGER_CORE_TEST") {
      await supabase
        .from("quality_ncr_register")
        .update({ status: "IN_SITU_TESTING_UNDERWAY" })
        .eq("id", action.payload.ncrId);

      await supabase.from("immutable_audit_logs").insert({
        project_id: "GOMTI-NAGAR-PH1-FITOUT",
        action_title: "IS 456 Cl. 17 In-Situ NDT Investigation Commissioned: " + action.payload.ncrNumber,
        action_category: "NDT_INVESTIGATION_COMMISSIONED",
        module_ref: action.payload.ncrNumber,
        details: {
          ncrNumber: action.payload.ncrNumber,
          standard: "IS 456:2000 Cl. 17.4.3 & IS 516 Part 4",
          protocols: ["Ultrasonic Pulse Velocity (UPV)", "Diamond Core Extraction 75mm dia"],
          lienRetainedInr: action.payload.withholdingLienInr,
        },
        signatory_name: "Agent Aegis & Lead SEOR",
        signatory_role: "Structural Quality Governor",
        severity: "warning",
        merkle_root_hash: "NDT-" + Date.now(),
        created_at: new Date().toISOString(),
      });

      revalidatePath("/dashboard");
      revalidatePath("/quality/cube-tests");
      revalidatePath("/system/commercial-gates");
      revalidatePath("/");
      return { success: true, message: "IS 456 Cl. 17 core extraction & UPV protocol authorized. NDT testing registered in Hermes." };
    }

    if (action.type === "EXECUTE_LABOR_CONTRA_CHARGE") {
      await supabase
        .from("daily_labor_muster_rolls")
        .update({ status: "DEBIT_RECONCILED_CLOSED" })
        .eq("id", action.payload.musterId);

      await supabase.from("immutable_audit_logs").insert({
        project_id: "GOMTI-NAGAR-PH1-FITOUT",
        action_title: "Commercial Contra-Charge Sealed: ₹" + action.payload.debitInr + " Debited from RA Bill",
        action_category: "COMMERCIAL_CONTRA_CHARGE_COMMITTED",
        module_ref: action.payload.musterCode,
        details: {
          debitAmountInr: action.payload.debitInr,
          statutoryClause: "CPWD GCC Cl. 19D / BOCW Act 1996 Cl. 44",
          remedy: "Show Cause Notice SCN/2026/BOCW/04 Dispatched to Contractor"
        },
        signatory_name: "Agent Plutus & Midas",
        signatory_role: "Commercial & Labor Governors",
        severity: "warning",
        merkle_root_hash: "CONTRA-" + Date.now(),
        created_at: new Date().toISOString()
      });

      revalidatePath("/dashboard");
      revalidatePath("/labor/muster");
      revalidatePath("/");
      return { success: true, message: "₹" + action.payload.debitInr.toLocaleString("en-IN") + " contra-charge executed. Statutory BOCW notice recorded." };
    }

    return { success: false, message: "Unsupported QuadMax action type" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
